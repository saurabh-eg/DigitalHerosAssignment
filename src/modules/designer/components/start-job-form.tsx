"use client";

import { useActionState, useState } from "react";
import { ActionMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import type { StartJobInput } from "../designer.validator";

type Template = { id: string; name: string; isDefault: boolean; svg: string };
type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const SUBMIT_LABEL = { design: "Start designing", upload: "Continue to upload", csv: "Continue to the spreadsheet merge" };

export function StartJobForm({ input, templates, action }: { input: StartJobInput; templates: Template[]; action: FormAction }) {
  const [state, formAction] = useActionState(action, idle as ActionResult);
  const [templateId, setTemplateId] = useState(templates.find((t) => t.isDefault)?.id ?? templates[0]?.id);
  const showTemplates = input.path !== "upload" && templates.length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <ActionMessage state={state} />
      {Object.entries(input).map(([key, value]) =>
        key === "template" || value === undefined ? null : <input key={key} type="hidden" name={key} value={String(value)} />,
      )}
      {showTemplates && (
        <fieldset>
          <legend className="mb-3 font-display text-lg font-semibold">Start from a template</legend>
          <div role="radiogroup" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <label
                key={t.id}
                className={cn(
                  "flex cursor-pointer flex-col gap-3 rounded-[var(--radius-card)] border bg-surface p-4 transition-colors",
                  templateId === t.id ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink/50",
                )}
              >
                <input type="radio" name="template" value={t.id} checked={templateId === t.id} onChange={() => setTemplateId(t.id)} className="sr-only" />
                <span
                  className="grid aspect-[4/3] place-items-center rounded bg-paper p-4 [&>svg]:h-auto [&>svg]:max-h-full [&>svg]:w-full [&>svg]:shadow-[0_2px_8px_rgba(26,32,48,0.15)]"
                  // Server-rendered SVG built from our own template data and outlined fonts.
                  dangerouslySetInnerHTML={{ __html: t.svg }}
                />
                <span className="font-medium">{t.name}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-muted">You can change every word, colour and position in the designer.</p>
        </fieldset>
      )}
      <SubmitButton size="lg" className="self-start" pendingLabel="Setting up…">
        {SUBMIT_LABEL[input.path]}
      </SubmitButton>
    </form>
  );
}
