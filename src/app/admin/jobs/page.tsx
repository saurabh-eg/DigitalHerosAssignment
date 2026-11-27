import type { Metadata } from "next";
import { ROUTES } from "@/constants/routes";
import * as catalogueController from "@/modules/catalogue/catalogue.controller";
import { JobFilters, JobTable } from "@/modules/orders/components/job-table";
import * as ordersController from "@/modules/orders/orders.controller";

export const metadata: Metadata = { title: "Job database" };

/** PRD §11 searchable job database. */
export default async function JobsPage({ searchParams }: PageProps<"/admin/jobs">) {
  const query = await searchParams;
  const [{ filters, rows, total }, hub] = await Promise.all([ordersController.searchJobs({ ...query, archived: "exclude" }), catalogueController.getHub()]);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Job database</h1>
        <p className="mt-1 text-ink-muted">Search every live job by order number, customer, status, date or product family.</p>
      </header>
      <JobFilters filters={filters} divisions={hub} basePath={ROUTES.admin.jobs} />
      <JobTable rows={rows} total={total} filters={filters} basePath={ROUTES.admin.jobs} />
    </div>
  );
}
