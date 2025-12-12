import { type Request, type Response } from "express";
import { stripe } from "../config/stripeConfig.ts";
import { ENV } from "../lib/ENV.ts";
import { addCredits } from "../lib/credits.ts";
import UserModel from "../models/UserModel.ts";
import type Stripe from "stripe";
import CreditTxnModel from "../models/CreditTxnModel.ts";
import mongoose from "mongoose";

/**
 * Create checkout session
 * POST /api/payments/checkout
 * Body: { userId, credits }  -> returns { url, id }
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { userId, credits } = req.body ?? {};
    const creditsNum = Number(credits ?? 0);

    if (!userId || !creditsNum || creditsNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "userId and positive credits count are required",
      });
    }

    // ensure user exists
    const user = await UserModel.findById(userId).lean()!;
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // calculate amount (cents)
    const creditsPriceCents = Number(ENV.CREDIT_PRICE_CENTS ?? 0);
    if (!creditsPriceCents || Number.isNaN(creditsPriceCents) || creditsPriceCents <= 0) {
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration: CREDIT_PRICE_CENTS not set",
      });
    }

    const totalCents = Math.max(0, Math.round(creditsPriceCents * creditsNum));

    // build success/cancel urls
    const frontendOrigin = String(ENV.FRONTEND_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
    const successUrl = `${frontendOrigin}/payments/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendOrigin}/payments/cancel`;

    console.log(`Creating checkout session for user ${userId}: ${creditsNum} credits = $${totalCents / 100}`);

    // create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${creditsNum} credits for ${ENV.APP_NAME ?? "App"}`,
              description: `Purchase ${creditsNum} credits`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: String(userId),
        credits: String(creditsNum),
      },
    });

    console.log(`Checkout session created: ${session.id}`);

    return res.status(200).json({
      success: true,
      message: "Checkout session created",
      data: { url: session.url, id: session.id },
    });
  } catch (err: any) {
    console.error("createCheckoutSession error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: String(err?.message ?? err),
    });
  }
};

/**
 * Webhook handler - expects raw body middleware.
 * POST /api/stripe/webhook
 */
export const stripeWebhookHandler = async (req: Request, res: Response) => {
  console.log("=".repeat(60));
  console.log("🔔 STRIPE WEBHOOK CALLED");
  console.log("=".repeat(60));
  
  const sig = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = ENV.STRIPE_WEBHOOK_SECRET;

  console.log("Webhook Debug Info:", {
    method: req.method,
    path: req.path,
    hasSignature: !!sig,
    signaturePreview: sig ? sig.substring(0, 20) + "..." : "none",
    hasSecret: !!webhookSecret,
    secretPreview: webhookSecret ? webhookSecret.substring(0, 10) + "..." : "none",
    bodyType: typeof req.body,
    isBuffer: Buffer.isBuffer(req.body),
    bodyLength: req.body?.length || 0,
    headers: Object.keys(req.headers),
  });

  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET not set in environment");
    return res.status(500).send("Webhook secret not configured");
  }

  if (!sig) {
    console.error("❌ No stripe-signature header found");
    return res.status(400).send("No signature header");
  }

  let event: Stripe.Event;

  try {
    // req.body should be a Buffer due to express.raw() middleware
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log("✅ Webhook signature verified:", event.type);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err?.message ?? err);
    return res.status(400).send(`Webhook Error: ${err?.message ?? err}`);
  }

  // Handle events
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata ?? {};
        const userId = String(metadata.userId ?? "");
        const credits = Number(metadata.credits ?? 0);
        const sessionId = String(session.id ?? "");

        console.log("💳 Processing checkout.session.completed:", {
          sessionId,
          userId,
          credits,
          paymentStatus: session.payment_status,
        });

        if (!sessionId) {
          console.warn("⚠️ Missing session.id");
          break;
        }

        // === Idempotency check ===
        const existing = await CreditTxnModel.findOne({ "meta.sessionId": sessionId });
        if (existing) {
          console.log(`⏭️  Session ${sessionId} already processed (txn: ${existing._id}). Skipping.`);
          break;
        }

        // === Validate payload ===
        if (!userId || !credits || credits <= 0) {
          console.error("❌ Invalid metadata:", { userId, credits, sessionId });
          // Log invalid attempt
          await CreditTxnModel.create({
            user: userId || null,
            change: 0,
            reason: "stripe_purchase_invalid_meta",
            meta: { sessionId, error: "Invalid metadata" },
          });
          break;
        }

        // === Add credits ===
        try {
          console.log(`💰 Adding ${credits} credits to user ${userId}...`);
          
          // Check user exists first
          const userCheck = await UserModel.findById(userId)!;
          console.log("User check:", {
            exists: !!userCheck,
            currentCredits: userCheck?.credits,
            email: userCheck?.email,
          });
          
          const updatedUser = await addCredits(
            userId,
            credits,
            "stripe_purchase",
            {
              sessionId,
              amount_total: session.amount_total,
              currency: session.currency,
              payment_status: session.payment_status,
            }
          );

          if (!updatedUser) {
            throw new Error("addCredits returned null - user not found");
          }

          console.log(`✅ Successfully added ${credits} credits to user ${userId}`);
          console.log(`   New balance: ${updatedUser.credits} credits`);
          
          // Verify transaction was created
          const txnCheck = await CreditTxnModel.findOne({ "meta.sessionId": sessionId });
          console.log("Transaction check:", {
            created: !!txnCheck,
            txnId: txnCheck?._id,
            change: txnCheck?.change,
          });
        } catch (creditErr: any) {
          console.error("❌ Failed to add credits:", creditErr);
          
          // Log failed transaction
          await CreditTxnModel.create({
            user: userId,
            change: 0,
            reason: "stripe_purchase_failed",
            meta: {
              sessionId,
              error: String(creditErr?.message ?? creditErr),
            },
          });
        }

        break;
      }

      case "payment_intent.succeeded":
        console.log("ℹ️  Payment intent succeeded:", event.data.object.id);
        break;

      case "invoice.payment_succeeded":
        console.log("ℹ️  Invoice payment succeeded:", event.data.object.id);
        break;

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
        break;
    }
  } catch (handlerErr: any) {
    console.error("❌ Error handling webhook event:", handlerErr);
    // Return 200 to prevent Stripe from retrying
    // (you might want to return 500 for critical failures to force retry)
  }

  // Acknowledge receipt
  res.status(200).json({ received: true });
};

/**
 * Get checkout session details
 * GET /api/payments/session/:id
 */
export const getCheckoutSession = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json({ success: false, message: "session id required" });
    }

    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ["payment_intent", "line_items"],
    });

    return res.status(200).json({ success: true, data: session });
  } catch (err: any) {
    console.error("getCheckoutSession error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: String(err?.message ?? err),
    });
  }
};

export const listTransactions = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(200, Number(req.query.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    // free text search: try to match reason or meta.sessionId or meta.* string values
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { reason: re },
        { "meta.sessionId": re },
        // if meta contains text fields you want to match, you can add them:
        { "meta.paymentId": re },
        // fallback: search JSON-stringified meta (works but is less efficient)
        { meta: { $regex: re } as any },
      ];
    }

    // filter by userId (ObjectId)
    if (req.query.userId) {
      const maybe = String(req.query.userId ?? "");
      if (mongoose.Types.ObjectId.isValid(maybe)) {
        filter.user = new mongoose.Types.ObjectId(maybe);
      } else {
        // no results if invalid id
        return res.status(200).json({ success: true, message: "Transactions fetched", data: { page, limit, total: 0, items: [] } });
      }
    }

    // filter by sessionId (in meta.sessionId)
    if (req.query.sessionId) {
      filter["meta.sessionId"] = String(req.query.sessionId);
    }

    // exact reason match
    if (req.query.reason) {
      filter.reason = String(req.query.reason);
    }

    // date range (createdAt)
    const dateFrom = req.query.date_from ? new Date(String(req.query.date_from)) : null;
    const dateTo = req.query.date_to ? new Date(String(req.query.date_to)) : null;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom && !isNaN(dateFrom.getTime())) filter.createdAt.$gte = dateFrom;
      if (dateTo && !isNaN(dateTo.getTime())) {
        // include the whole "to" day if user passed only a date by adding 1 day - optional
        filter.createdAt.$lte = dateTo;
      }
      // if both invalid, remove
      if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    // fetch items + total count in parallel, populate user (email, _id)
    const [items, total] = await Promise.all([
      CreditTxnModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "email _id") // populate only email and id
        .lean(),
      CreditTxnModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Transactions fetched",
      data: { page, limit, total, items },
    });
  } catch (err: any) {
    console.error("Error listing transactions:", err?.response?.data ?? err?.message ?? err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err?.response?.data ?? err?.message ?? String(err),
    });
  }
};

export const listStripeTransactions = async (req: Request, res: Response) => {
  try {
    // reuse the same pagination / filter pattern as listTransactions
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(200, Number(req.query.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: any = { reason: "stripe_purchase" };

    // optional search
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { "meta.sessionId": re },
        { "meta.paymentId": re },
        { "meta.customer_email": re },
        { "meta.customer": re },
        { meta: { $regex: re } as any },
      ];
    }

    // optional userId filter
    if (req.query.userId) {
      const maybe = String(req.query.userId ?? "");
      if (mongoose.Types.ObjectId.isValid(maybe)) filter.user = new mongoose.Types.ObjectId(maybe);
      else {
        return res.status(200).json({ success: true, message: "Transactions fetched", data: { page, limit, total: 0, items: [] } });
      }
    }

    // optional sessionId filter
    if (req.query.sessionId) {
      filter["meta.sessionId"] = String(req.query.sessionId);
    }

    // date range
    const dateFrom = req.query.date_from ? new Date(String(req.query.date_from)) : null;
    const dateTo = req.query.date_to ? new Date(String(req.query.date_to)) : null;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom && !isNaN(dateFrom.getTime())) filter.createdAt.$gte = dateFrom;
      if (dateTo && !isNaN(dateTo.getTime())) filter.createdAt.$lte = dateTo;
      if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    const [items, total] = await Promise.all([
      CreditTxnModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("user", "email _id").lean().exec(),
      CreditTxnModel.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, message: "Stripe transactions fetched", data: { page, limit, total, items } });
  } catch (err: any) {
    console.error("Error listing stripe transactions:", err?.response?.data ?? err?.message ?? err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err?.response?.data ?? err?.message ?? String(err) });
  }
};
