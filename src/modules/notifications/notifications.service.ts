import "server-only";
import { Resend } from "resend";
import { publicEnv } from "@/config/env.public";
import { serverEnv } from "@/config/env.server";
import type { EmailTemplate } from "@/constants/email";
import { ROUTES } from "@/constants/routes";
import { renderEmail, type EmailData } from "./notifications.templates";

let client: Resend | undefined;

/**
 * Sends a transactional email (PRD §13). Never throws: a failed email must not undo a payment or an
 * approval, and the order's status history is the record of what happened (D-034).
 */
export async function sendOrderEmail(
  template: EmailTemplate,
  to: string,
  data: Omit<EmailData, "orderUrl"> & { orderId: string },
): Promise<boolean> {
  try {
    client ??= new Resend(serverEnv().RESEND_API_KEY);
    const { subject, html } = renderEmail(template, {
      ...data,
      orderUrl: `${publicEnv().NEXT_PUBLIC_SITE_URL}${ROUTES.account.order(data.orderId)}`,
    });
    const { error } = await client.emails.send({ from: serverEnv().EMAIL_FROM, to, subject, html });
    if (error) {
      console.warn(`Email "${template}" to customer not sent: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`Email "${template}" failed`, error instanceof Error ? error.message : error);
    return false;
  }
}
