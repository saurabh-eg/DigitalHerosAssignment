import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function DesignerLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <PageSkeleton blocks={2} />
    </main>
  );
}
