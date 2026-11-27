import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROUTES } from "@/constants/routes";
import * as authController from "@/modules/auth/auth.controller";

const GROUPS = [
  {
    label: "Production",
    items: [
      { href: ROUTES.admin.root, label: "Overview", exact: true, icon: "overview" as const },
      { href: ROUTES.admin.pipeline, label: "Pipeline", icon: "pipeline" as const },
      { href: ROUTES.admin.jobs, label: "Job database", icon: "jobs" as const },
      { href: ROUTES.admin.archive, label: "Archive", icon: "archive" as const },
    ],
  },
  {
    label: "Business",
    items: [
      { href: ROUTES.admin.reports, label: "Reports", icon: "reports" as const },
      { href: ROUTES.admin.users, label: "Users", icon: "users" as const },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: ROUTES.admin.catalogue, label: "Products & templates", icon: "catalogue" as const },
      { href: ROUTES.admin.gallery, label: "Gallery", icon: "gallery" as const },
    ],
  },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await authController.requirePageAdmin();
  return (
    <DashboardShell name={admin.fullName ?? admin.email} caption="Production console" badge="Admin" groups={GROUPS} navLabel="Console" wide>
      {children}
    </DashboardShell>
  );
}
