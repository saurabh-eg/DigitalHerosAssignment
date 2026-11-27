// Visitors are unauthenticated, so they have no stored role.
export const ROLE = {
  CUSTOMER: "customer",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];
export type Actor = Role | "visitor";

export const PERMISSION = {
  VIEW_CATALOGUE: "catalogue:view",
  USE_CALCULATOR: "calculator:use",
  MANAGE_OWN_PROFILE: "profile:manage_own",
  PLACE_ORDER: "order:place",
  MANAGE_OWN_DESIGNS: "design:manage_own",
  REVIEW_OWN_PROOFS: "proof:review_own",
  VIEW_OWN_ORDERS: "order:view_own",
  MANAGE_USERS: "user:manage",
  MANAGE_ORDERS: "order:manage",
  RUN_PIPELINE: "pipeline:run",
  DOWNLOAD_PRODUCTION_FILES: "production_file:download",
  MANAGE_CATALOGUE: "catalogue:manage",
  VIEW_REPORTS: "report:view",
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

const PUBLIC: Permission[] = [PERMISSION.VIEW_CATALOGUE, PERMISSION.USE_CALCULATOR];

// PRD §03. Admins are staff, not shoppers, so they do not inherit customer permissions.
export const ROLE_PERMISSIONS: Record<Actor, readonly Permission[]> = {
  visitor: PUBLIC,
  customer: [
    ...PUBLIC,
    PERMISSION.MANAGE_OWN_PROFILE,
    PERMISSION.PLACE_ORDER,
    PERMISSION.MANAGE_OWN_DESIGNS,
    PERMISSION.REVIEW_OWN_PROOFS,
    PERMISSION.VIEW_OWN_ORDERS,
  ],
  admin: [
    ...PUBLIC,
    PERMISSION.MANAGE_OWN_PROFILE,
    PERMISSION.MANAGE_USERS,
    PERMISSION.MANAGE_ORDERS,
    PERMISSION.RUN_PIPELINE,
    PERMISSION.DOWNLOAD_PRODUCTION_FILES,
    PERMISSION.MANAGE_CATALOGUE,
    PERMISSION.VIEW_REPORTS,
  ],
};

export function can(actor: Actor, permission: Permission): boolean {
  return ROLE_PERMISSIONS[actor].includes(permission);
}
