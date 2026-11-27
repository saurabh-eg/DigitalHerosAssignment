export const SITE_CONFIG = {
  name: "Digital Heroes",
  tagline: "Custom print, made properly.",
  description:
    "Labels, race numbers, MTB boards, stamps, trophies and laser-cut work — configure, design, proof and order online.",
  supportEmail: "support@digitalheroes.example",
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
  invoicePrefix: "DH-INV-",
  orderPrefix: "DH",
  salesAccountCode: "200",
  deliveryAccountCode: "260",
  paymentTermsDays: 0,
} as const;
