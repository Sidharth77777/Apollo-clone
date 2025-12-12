import Stripe from "stripe";
import { ENV } from "../lib/ENV.ts";

export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY)
