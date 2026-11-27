import type { Role } from "@/constants/roles";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  /** The user's personal organization; orders and designs are owned by it (D-016). */
  organizationId: string;
};
