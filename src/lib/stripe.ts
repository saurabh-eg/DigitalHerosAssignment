import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/config/env.server";

let client: Stripe | undefined;

export function stripe(): Stripe {
  client ??= new Stripe(serverEnv().STRIPE_SECRET_KEY, { appInfo: { name: "Makeready" } });
  return client;
}

export type { Stripe };
