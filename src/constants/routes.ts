export const ROUTES = {
  home: "/",
  products: "/products",
  division: (division: string) => `/products/${division}`,
  product: (division: string, product: string) => `/products/${division}/${product}`,
  calculator: "/calculator",
  gallery: "/gallery",
  cart: "/cart",
  checkout: "/checkout",
  login: "/login",
  signup: "/signup",
  resetPassword: "/reset-password",
  account: {
    root: "/account",
    orders: "/account/orders",
    order: (id: string) => `/account/orders/${id}`,
    designs: "/account/designs",
    proofs: "/account/proofs",
    invoices: "/account/invoices",
    invoice: (orderId: string) => `/account/invoices/${orderId}`,
    settings: "/account/settings",
  },
  designer: (designId: string) => `/design/${designId}`,
  /** Starts a job from a configuration; `path` picks the designer, artwork upload or CSV merge. */
  startJob: (query: Record<string, string>) => `/design/new?${new URLSearchParams(query).toString()}`,
  admin: {
    root: "/admin",
    pipeline: "/admin/pipeline",
    jobs: "/admin/jobs",
    job: (id: string) => `/admin/jobs/${id}`,
    jobFile: (id: string, fileId: string) => `/admin/jobs/${id}/files/${fileId}`,
    jobZip: (id: string) => `/admin/jobs/${id}/files/zip`,
    catalogueProduct: (id: string) => `/admin/catalogue/${id}`,
    xeroExport: "/admin/reports/xero",
    users: "/admin/users",
    catalogue: "/admin/catalogue",
    templates: "/admin/templates",
    gallery: "/admin/gallery",
    reports: "/admin/reports",
    archive: "/admin/archive",
  },
} as const;

export const API_BASE = "/api/v1";

export const PROTECTED_PREFIXES = {
  customer: ["/account", "/design", "/checkout", "/cart"],
  admin: ["/admin"],
} as const;
