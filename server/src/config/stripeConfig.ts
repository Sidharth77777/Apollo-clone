import Stripe from "stripe";
import { ENV } from "../lib/ENV.js";

export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY)
