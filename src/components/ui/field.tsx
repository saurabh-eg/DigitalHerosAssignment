import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  errors?: string[];
};

export function Field({ label, hint, errors, className, id, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = errors?.length ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy}
        className="h-11 rounded-lg border border-line bg-surface px-3.5 text-base text-ink transition-colors placeholder:text-ink-muted/60 hover:border-ink/40 focus:border-ink focus:outline-none aria-invalid:border-danger"
        {...props}
      />
      {errors?.length ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
