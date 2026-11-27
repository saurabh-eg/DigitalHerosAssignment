export const SITE_CONFIG = {
  // D-045: product name; the platform is built for (and credited to) Digital Heroes.
  name: "Makeready",
  company: "Digital Heroes",
  tagline: "Custom print, priced as you choose it.",
  description:
    "Labels, race numbers, MTB boards, stamps, trophies and laser-cut work — configure, design, proof and order online.",
  supportEmail: "support@makeready.example",
  locale: "en-GB",
  currency: "GBP",
} as const;

// D-006: prices are displayed tax-inclusive; rate in basis points to keep maths in integers.
export const TAX_CONFIG = {
  label: "VAT",
  rateBps: 2000,
  pricesIncludeTax: true,
  xeroTaxType: "OUTPUT2",
  xeroLineAmountType: "Inclusive",
} as const;

// D-013: amounts in minor units (pence), tax-inclusive.
export const DELIVERY_CONFIG = {
  flatFeeMinor: 495,
  freeThresholdMinor: 7500,
  collectionAvailable: true,
} as const;

export const ACCOUNTING_CONFIG = {
  invoicePrefix: "MR-INV-",
  orderPrefix: "MR",
  salesAccountCode: "200",
  deliveryAccountCode: "260",
  paymentTermsDays: 0,
} as const;
