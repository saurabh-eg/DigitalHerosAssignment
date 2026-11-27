import { SideNav } from "@/components/layout/side-nav";
import { ROUTES } from "@/constants/routes";
import * as authController from "@/modules/auth/auth.controller";

const NAV = [
  { href: ROUTES.account.root, label: "Overview", exact: true },
  { href: ROUTES.account.orders, label: "Orders" },
  { href: ROUTES.account.settings, label: "Profile & settings" },
];

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await authController.requirePageUser(ROUTES.account.root);
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6 md:grid-cols-[200px_1fr] md:gap-10 md:py-12">
      <aside className="flex flex-col gap-4">
        <div>
          <p className="truncate font-display text-lg font-semibold">{user.fullName ?? user.email}</p>
          <p className="text-sm text-ink-muted">Customer account</p>
        </div>
        <SideNav items={NAV} label="Account" />
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
