import "server-only";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // Allow build without keys; fail at first runtime use.
  console.warn("[stripe] STRIPE_SECRET_KEY not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_dummy", {
  apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
  typescript: true,
});

export const PRICE_IDS = {
  pro_month: process.env.STRIPE_PRICE_PRO_M ?? "",
  pro_year: process.env.STRIPE_PRICE_PRO_Y ?? "",
  team_month: process.env.STRIPE_PRICE_TEAM_M ?? "",
  team_year: process.env.STRIPE_PRICE_TEAM_Y ?? "",
} as const;
