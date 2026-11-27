// PRD §11 pipeline. `cancelled` sits outside the six stages (D-024).
export const ORDER_STATUS = {
  QUOTE: "quote",
  ORDER: "order",
  ARTWORK: "artwork",
  PROOF: "proof",
  PRODUCTION: "production",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PIPELINE_STAGES: readonly OrderStatus[] = [
  ORDER_STATUS.QUOTE,
  ORDER_STATUS.ORDER,
  ORDER_STATUS.ARTWORK,
  ORDER_STATUS.PROOF,
  ORDER_STATUS.PRODUCTION,
  ORDER_STATUS.COMPLETED,
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  quote: "Quote",
  order: "Order",
  artwork: "Artwork",
  proof: "Proof",
  production: "Production",
  completed: "Completed",
  cancelled: "Cancelled",
};

// PROOF → PRODUCTION is only allowed by the proofs service after an approval (approval gate, PRD §08).
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  quote: ["order", "cancelled"],
  order: ["artwork", "cancelled"],
  artwork: ["proof", "cancelled"],
  proof: ["artwork", "production", "cancelled"],
  production: ["completed"],
  completed: [],
  cancelled: [],
};

export const PROOF_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  CHANGES_REQUESTED: "changes_requested",
  SUPERSEDED: "superseded",
} as const;

export type ProofStatus = (typeof PROOF_STATUS)[keyof typeof PROOF_STATUS];

export const PRINT_JOB_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
} as const;

export type PrintJobStatus = (typeof PRINT_JOB_STATUS)[keyof typeof PRINT_JOB_STATUS];
