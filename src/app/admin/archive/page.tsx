import type { Metadata } from "next";
import { ROUTES } from "@/constants/routes";
import * as catalogueController from "@/modules/catalogue/catalogue.controller";
import { JobFilters, JobTable } from "@/modules/orders/components/job-table";
import * as ordersController from "@/modules/orders/orders.controller";

export const metadata: Metadata = { title: "Archive" };

/** PRD §11 archive: completed work kept for fast retrieval on repeat and event orders. */
export default async function ArchivePage({ searchParams }: PageProps<"/admin/archive">) {
  const query = await searchParams;
  const [{ filters, rows, total }, hub] = await Promise.all([ordersController.searchJobs({ ...query, archived: "only" }), catalogueController.getHub()]);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Archive</h1>
        <p className="mt-1 text-ink-muted">
          Finished jobs with their approved artwork and production files, ready to pull up for next year&apos;s event or a repeat order.
        </p>
      </header>
      <JobFilters filters={filters} divisions={hub} basePath={ROUTES.admin.archive} />
      <JobTable rows={rows} total={total} filters={filters} basePath={ROUTES.admin.archive} />
    </div>
  );
}
