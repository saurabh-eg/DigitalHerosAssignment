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
    settings: "/account/settings",
  },
  designer: (designId: string) => `/design/${designId}`,
  admin: {
    root: "/admin",
    pipeline: "/admin/pipeline",
    jobs: "/admin/jobs",
    job: (id: string) => `/admin/jobs/${id}`,
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
  customer: ["/account", "/design", "/checkout"],
  admin: ["/admin"],
} as const;
