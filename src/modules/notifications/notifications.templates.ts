import { EMAIL_SUBJECT, type EmailTemplate } from "@/constants/email";
import { SITE_CONFIG } from "@/constants/site-config";
import { formatMoney } from "@/lib/money";

export type EmailData = {
  orderNumber: string;
  customerName: string | null;
  orderUrl: string;
  totalMinor?: number;
  statusLabel?: string;
  comment?: string;
  items?: Array<{ name: string; quantity: number }>;
};

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const BODY: Record<EmailTemplate, (d: EmailData) => string> = {
  order_confirmed: (d) =>
    `<p>Thanks for your order. We've received your payment${d.totalMinor !== undefined ? ` of <strong>${formatMoney(d.totalMinor)}</strong>` : ""}.</p>
     ${d.items?.length ? `<ul>${d.items.map((i) => `<li>${i.quantity.toLocaleString("en-GB")} × ${escape(i.name)}</li>`).join("")}</ul>` : ""}
     <p>Your proofs are being prepared. We'll email you when they're ready to approve.</p>`,
  proof_ready: () =>
    `<p>Your proof is ready. Please check it carefully: what you approve is exactly what we print.</p>
     <p>You can approve it or ask for changes from your order page.</p>`,
  proof_changes_requested: (d) =>
    `<p>We've recorded your change request${d.comment ? `:</p><blockquote>${escape(d.comment)}</blockquote><p>` : ". "}Edit your design and submit it again to get a revised proof.</p>`,
  proof_approved: () => `<p>Thanks for approving your proof. Your job is now in production.</p>`,
  status_changed: (d) => `<p>Your order is now at the <strong>${escape(d.statusLabel ?? "")}</strong> stage.</p>`,
  order_completed: () => `<p>Your order is complete. Thanks for printing with us. You can reorder the same artwork in one click from your account.</p>`,
};

export function renderEmail(template: EmailTemplate, data: EmailData): { subject: string; html: string } {
  const greeting = data.customerName ? `Hi ${escape(data.customerName.split(" ")[0])},` : "Hello,";
  const html = `<!doctype html><html><body style="margin:0;background:#eef0f2;font-family:Arial,Helvetica,sans-serif;color:#1a2030">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="font-size:18px;font-weight:bold;margin:0 0 24px">${SITE_CONFIG.name}</p>
    <div style="background:#ffffff;border-radius:8px;padding:24px;font-size:15px;line-height:1.55">
      <p>${greeting}</p>
      ${BODY[template](data)}
      <p style="margin-top:24px"><a href="${escape(data.orderUrl)}" style="background:#c8006a;color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;display:inline-block">View order ${escape(data.orderNumber)}</a></p>
    </div>
    <p style="font-size:12px;color:#59616f;margin-top:16px">${SITE_CONFIG.name} by ${SITE_CONFIG.company}. Prices include VAT.</p>
  </div></body></html>`;
  return { subject: EMAIL_SUBJECT[template](data.orderNumber), html };
}
