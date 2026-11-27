import type { ItemPreview } from "@/modules/designer/designer.orders";
import { cn } from "@/lib/cn";

/** Thumbnail of an order line: the rendered design or the uploaded file. */
export function LinePreview({ preview, className }: { preview: ItemPreview | null; className?: string }) {
  const frame = cn("grid aspect-[4/3] place-items-center overflow-hidden rounded-md bg-[#e2e5ea] p-2", className);
  if (preview?.kind === "svg") {
    return (
      <div
        className={cn(frame, "[&>svg]:h-auto [&>svg]:max-h-full [&>svg]:w-full [&>svg]:shadow-[0_2px_6px_rgba(26,32,48,0.2)]")}
        // Server-rendered from the customer's saved design; text is outlined, colours validated.
        dangerouslySetInnerHTML={{ __html: preview.svg }}
      />
    );
  }
  if (preview?.kind === "file" && preview.url && (preview.mimeType === "image/png" || preview.mimeType === "image/svg+xml")) {
    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
    return <div className={frame}><img src={preview.url} alt={preview.name} className="max-h-full object-contain" /></div>;
  }
  return (
    <div className={cn(frame, "text-center text-xs text-ink-muted")}>
      {preview?.kind === "file" ? preview.name : "Preview unavailable"}
    </div>
  );
}
