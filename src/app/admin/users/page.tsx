import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { Pagination } from "@/components/ui/pagination";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import * as authController from "@/modules/auth/auth.controller";
import * as usersController from "@/modules/users/users.controller";
import { setDisabledAction, setRoleAction } from "../actions";

export const metadata: Metadata = { title: "Users" };

/** PRD §03 admin: manage users. */
export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const [{ q, users, total, page, pageSize }, me] = await Promise.all([usersController.listUsers(await searchParams), authController.getSessionUser()]);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="mt-1 text-ink-muted">Customers and staff. Disabled accounts can&apos;t sign in.</p>
      </header>
      <form method="get" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, email or company" className="h-10 w-full max-w-sm rounded-md border border-line bg-surface px-3 text-sm focus:border-ink focus:outline-none" />
        <button type="submit" className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-surface">
          Search
        </button>
      </form>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-line text-left text-ink-muted">
            <tr>
              <th className="p-3 font-medium">User</th>
              <th className="p-3 font-medium">Joined</th>
              <th className="p-3 font-medium">Orders</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className={cn(u.isDisabled && "opacity-60")}>
                <td className="p-3">
                  <span className="block font-medium">{u.fullName ?? "—"}</span>
                  <span className="block text-xs text-ink-muted">
                    {u.email}
                    {u.companyName && `, ${u.companyName}`}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</td>
                <td className="p-3">
                  {u.orders > 0 ? (
                    <Link href={`${ROUTES.admin.jobs}?q=${encodeURIComponent(u.email)}`} className="hover:text-accent">
                      {u.orders} ({formatMoney(u.spentMinor)})
                    </Link>
                  ) : (
                    <span className="text-ink-muted">None</span>
                  )}
                </td>
                <td className="p-3">
                  {u.id === me?.id ? (
                    <span className="text-ink-muted">Admin (you)</span>
                  ) : (
                    <ActionForm action={setRoleAction} hidden={{ userId: u.id, role: u.role === "admin" ? "customer" : "admin" }} label={u.role === "admin" ? "Admin: make customer" : "Customer: make admin"} variant="ghost" />
                  )}
                </td>
                <td className="p-3">
                  {u.id === me?.id ? (
                    <span className="text-ink-muted">Active</span>
                  ) : (
                    <ActionForm
                      action={setDisabledAction}
                      hidden={{ userId: u.id, disabled: u.isDisabled ? "false" : "true" }}
                      label={u.isDisabled ? "Disabled: enable" : "Active: disable"}
                      variant="ghost"
                      confirm={u.isDisabled ? undefined : "Sign this user out and block sign-in"}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination basePath={ROUTES.admin.users} page={page} pageSize={pageSize} total={total} params={{ q: q || undefined }} noun={["user", "users"]} />
    </div>
  );
}
