import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROUTES } from "@/constants/routes";
import * as authController from "@/modules/auth/auth.controller";

const GROUPS = [
  {
    items: [
      { href: ROUTES.account.root, label: "Overview", exact: true, icon: "overview" as const },
      { href: ROUTES.account.orders, label: "Orders", icon: "orders" as const },
      { href: ROUTES.account.designs, label: "Saved designs", icon: "designs" as const },
      { href: ROUTES.account.invoices, label: "Invoices", icon: "invoices" as const },
    ],
  },
  { label: "Account", items: [{ href: ROUTES.account.settings, label: "Profile & settings", icon: "settings" as const }] },
];

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await authController.requirePageUser(ROUTES.account.root);
  return (
    <DashboardShell name={user.fullName ?? user.email} caption={user.email} groups={GROUPS} navLabel="Account">
      {children}
    </DashboardShell>
  );
}
