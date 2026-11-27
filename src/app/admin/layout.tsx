import { SideNav } from "@/components/layout/side-nav";
import { ROUTES } from "@/constants/routes";
import * as authController from "@/modules/auth/auth.controller";

const NAV = [{ href: ROUTES.admin.root, label: "Overview", exact: true }];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await authController.requirePageAdmin();
  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 sm:px-6 md:grid-cols-[200px_1fr] md:gap-10">
      <aside className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">Production console</p>
          <p className="mt-1 truncate font-medium">{admin.fullName ?? admin.email}</p>
        </div>
        <SideNav items={NAV} label="Console" />
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
