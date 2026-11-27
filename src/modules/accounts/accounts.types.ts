import type { Role } from "@/constants/roles";

export type Profile = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  companyName: string | null;
  vatNumber: string | null;
  role: Role;
  createdAt: string;
};
