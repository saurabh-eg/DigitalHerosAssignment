import { ORDER_STATUS_LABEL, PIPELINE_STAGES, type OrderStatus } from "@/constants/pipeline";
import { cn } from "@/lib/cn";

const CUSTOMER_HINT: Partial<Record<OrderStatus, string>> = {
  order: "Payment received.",
  artwork: "Waiting for your revised artwork.",
  proof: "Your proof is ready to review.",
  production: "Printing now.",
  completed: "Finished.",
};

/** The PRD §11 pipeline as a progress strip; the current stage is highlighted. */
export function PipelineTracker({ status }: { status: OrderStatus }) {
  const current = PIPELINE_STAGES.indexOf(status);
  if (status === "cancelled") return <p className="font-medium text-danger">This order was cancelled.</p>;
  return (
    <div className="flex flex-col gap-2">
      <ol className="grid grid-cols-6 gap-1" aria-label="Order progress">
        {PIPELINE_STAGES.map((stage, i) => (
          <li key={stage} className="flex flex-col gap-1.5" aria-current={i === current ? "step" : undefined}>
            <span className={cn("h-1.5 rounded-full", i < current ? "bg-ink" : i === current ? "bg-accent" : "bg-line")} />
            <span className={cn("hidden text-xs sm:block", i === current ? "font-semibold text-ink" : "text-ink-muted")}>{ORDER_STATUS_LABEL[stage]}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm">
        <span className="font-semibold">{ORDER_STATUS_LABEL[status]}</span>
        {CUSTOMER_HINT[status] && <span className="text-ink-muted">: {CUSTOMER_HINT[status]}</span>}
      </p>
    </div>
  );
}
