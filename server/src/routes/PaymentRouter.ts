import { Router } from "express";
import { createCheckoutSession, getCheckoutSession, listStripeTransactions, listTransactions } from "../controllers/PaymentController.ts";

const router = Router();

router.post("/checkout", createCheckoutSession);

router.get("/session/:id", getCheckoutSession);

router.get("/transactions", listTransactions);

router.get("/transactions/stripe", listStripeTransactions);

export default router;
