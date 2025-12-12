// test-webhook.ts
// Simulates a Stripe webhook call to test your handler
// Usage: npx tsx test-webhook.ts YOUR_USER_ID

import mongoose from "mongoose";
import { ENV } from "./lib/ENV.ts";
import UserModel from "./models/UserModel.ts";
import CreditTxnModel from "./models/CreditTxnModel.ts";
import { addCredits } from "./lib/credits.ts";

const simulateWebhook = async (userId: string) => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(ENV.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Simulate what the webhook handler does
    const sessionId = `cs_test_${Date.now()}`;
    const credits = 100;

    console.log("🎭 Simulating webhook checkout.session.completed");
    console.log("Session ID:", sessionId);
    console.log("User ID:", userId);
    console.log("Credits:", credits);

    // Check user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      console.error("❌ User not found");
      process.exit(1);
    }
    console.log("\n👤 User before:", {
      email: user.email,
      credits: user.credits,
    });

    // Check for duplicate session (idempotency)
    console.log("\n🔍 Checking for duplicate session...");
    const existing = await CreditTxnModel.findOne({
      "meta.sessionId": sessionId,
    });
    if (existing) {
      console.log("⏭️  Session already processed, skipping");
      process.exit(0);
    }
    console.log("✅ No duplicate found");

    // Add credits (same as webhook does)
    console.log("\n💰 Adding credits...");
    const updatedUser = await addCredits(userId, credits, "stripe_purchase", {
      sessionId: sessionId,
      amount_total: 100, // cents
      currency: "usd",
      payment_status: "paid",
    });

    if (!updatedUser) {
      console.error("❌ addCredits returned null");
      process.exit(1);
    }

    console.log("✅ Credits added!");
    console.log("User after:", {
      email: updatedUser.email,
      credits: updatedUser.credits,
      difference: updatedUser.credits - user.credits,
    });

    // Verify transaction was created
    console.log("\n📝 Verifying transaction record...");
    const txn = await CreditTxnModel.findOne({
      "meta.sessionId": sessionId,
    });

    if (!txn) {
      console.error("❌ Transaction not found!");
      process.exit(1);
    }

    console.log("✅ Transaction created:", {
      id: txn._id,
      change: txn.change,
      reason: txn.reason,
      sessionId: txn.meta?.sessionId,
    });

    // Show recent transactions
    console.log("\n📊 Recent transactions:");
    const recentTxns = await CreditTxnModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    console.table(
      recentTxns.map((t) => ({
        change: t.change,
        reason: t.reason,
        sessionId: t.meta?.sessionId || "N/A",
        date: t.createdAt?.toISOString().substring(0, 19).replace("T", " "),
      }))
    );

    console.log("\n✅ Webhook simulation successful!");
    console.log("\n🎯 If this works but real webhooks don't:");
    console.log("1. Check webhook signature verification");
    console.log("2. Make sure webhook endpoint is receiving requests");
    console.log("3. Check server logs when making real payments");
    console.log("4. Verify STRIPE_WEBHOOK_SECRET is correct");

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

const userId = process.argv[2];

if (!userId) {
  console.error("❌ Usage: npx tsx test-webhook.ts YOUR_USER_ID");
  console.error("Example: npx tsx test-webhook.ts 675915e49b9c2f1e2b38e7c0");
  process.exit(1);
}

simulateWebhook(userId);