// PRD 13: order updates, proof status, completion alerts. Sender address comes from EMAIL_FROM.
export const EMAIL_TEMPLATE = {
  ORDER_CONFIRMED: "order_confirmed",
  STATUS_CHANGED: "status_changed",
  PROOF_READY: "proof_ready",
  PROOF_CHANGES_REQUESTED: "proof_changes_requested",
  PROOF_APPROVED: "proof_approved",
  ORDER_COMPLETED: "order_completed",
} as const;

export type EmailTemplate = (typeof EMAIL_TEMPLATE)[keyof typeof EMAIL_TEMPLATE];

export const EMAIL_SUBJECT: Record<EmailTemplate, (orderNumber: string) => string> = {
  order_confirmed: (n) => `Order ${n} confirmed`,
  status_changed: (n) => `Update on order ${n}`,
  proof_ready: (n) => `Your proof for order ${n} is ready to review`,
  proof_changes_requested: (n) => `Changes requested on order ${n}`,
  proof_approved: (n) => `Proof approved — order ${n} is going to production`,
  order_completed: (n) => `Order ${n} is complete`,
};
