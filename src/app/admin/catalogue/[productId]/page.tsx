import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { ROUTES } from "@/constants/routes";
import { formatPercent } from "@/lib/money";
import * as catalogueAdmin from "@/modules/catalogue/catalogue.admin.controller";
import { TiersEditor } from "@/modules/catalogue/components/tiers-editor";
import {
  deleteTemplateAction,
  saveTemplateAction,
  updateMaterialsAction,
  updatePricingAction,
  updateProductAction,
  updateTiersAction,
} from "../../actions";

export const metadata: Metadata = { title: "Edit product" };

const field = "h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm focus:border-ink focus:outline-none";
const area = "w-full rounded-md border border-line bg-surface px-2.5 py-2 font-mono text-xs leading-relaxed focus:border-ink focus:outline-none";
const pounds = (minor: number) => (minor / 100).toFixed(2);

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{text}</span>
      {children}
    </label>
  );
}

function Check({ name, checked, text }: { name: string; checked: boolean; text: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="accent-accent" /> {text}
    </label>
  );
}

const SAMPLE_TEMPLATE = JSON.stringify(
  {
    background: "#ffffff",
    elements: [{ id: "title", type: "text", x: 0.05, y: 0.3, width: 0.9, height: 0.4, text: "Your text", fontFamily: "inter", fontWeight: 700, color: "#1a2030", align: "center" }],
  },
  null,
  2,
);

export default async function ProductAdminPage({ params }: PageProps<"/admin/catalogue/[productId]">) {
  const { productId } = await params;
  const { product, materials, tiers, templates } = await catalogueAdmin.productDetail(productId);
  const rule = product.pricing_rules;
  const selected = new Set(product.product_materials.map((m) => m.material_id));
  const defaultMaterial = product.product_materials.find((m) => m.is_default)?.material_id;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href={ROUTES.admin.catalogue} className="text-sm text-ink-muted hover:text-ink">
          Products & templates
        </Link>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="mt-1 text-ink-muted">
          {product.divisions?.name}. File code {product.product_type}.{" "}
          {product.is_active && product.divisions && (
            <Link href={ROUTES.product(product.divisions.slug, product.slug)} className="text-accent hover:underline">
              View on storefront
            </Link>
          )}
        </p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <h2 className="mb-3 text-lg font-semibold">Details and print specification</h2>
        <ActionForm action={updateProductAction} hidden={{ productId: product.id }} label="Save product" variant="primary">
          <div className="grid gap-3 md:grid-cols-2">
            <Label text="Name">
              <input name="name" defaultValue={product.name} required className={field} />
            </Label>
            <Label text="Summary">
              <input name="summary" defaultValue={product.summary} className={field} />
            </Label>
            <Label text="Bleed (mm per edge)">
              <input name="bleedMm" type="number" step="0.5" defaultValue={product.bleed_mm} className={field} />
            </Label>
            <Label text="Safe margin (mm)">
              <input name="safeMarginMm" type="number" step="0.5" defaultValue={product.safe_margin_mm} className={field} />
            </Label>
            <Label text="Print resolution (dpi)">
              <input name="dpi" type="number" defaultValue={product.dpi} className={field} />
            </Label>
            <div className="flex flex-col justify-end gap-1.5">
              <Check name="isActive" checked={product.is_active} text="Active (sellable on the storefront)" />
              <Check name="supportsDesigner" checked={product.supports_designer} text="Design online" />
              <Check name="supportsUpload" checked={product.supports_upload} text="Upload finished artwork" />
              <Check name="supportsVariableData" checked={product.supports_variable_data} text="Spreadsheet (CSV) merge" />
            </div>
            <Label text="Description">
              <textarea name="description" rows={3} defaultValue={product.description} className="rounded-md border border-line px-2.5 py-2 text-sm" />
            </Label>
            <Label text="Size, orientation and quantity rules (JSON)">
              <textarea name="parameters" rows={9} defaultValue={JSON.stringify(product.parameters, null, 2)} className={area} spellCheck={false} />
            </Label>
          </div>
        </ActionForm>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <h2 className="mb-1 text-lg font-semibold">Pricing</h2>
          <p className="mb-3 text-sm text-ink-muted">
            Unit price = (base + area × rate + characters × per-character) × material factor, then the volume discount; plus a one-off setup. All
            prices include VAT.
          </p>
          <ActionForm action={updatePricingAction} hidden={{ productId: product.id }} label="Save pricing" variant="primary">
            <div className="grid grid-cols-2 gap-3">
              <Label text="Strategy">
                <select name="strategy" defaultValue={rule?.strategy ?? "area"} className={field}>
                  <option value="area">By area</option>
                  <option value="per_unit">Per unit (size-based)</option>
                  <option value="per_character">Per character (engraving)</option>
                </select>
              </Label>
              <Label text="Setup fee (£)">
                <input name="setupFee" type="number" step="0.01" defaultValue={pounds(rule?.setup_fee_minor ?? 0)} className={field} />
              </Label>
              <Label text="Base per unit (£)">
                <input name="unitBase" type="number" step="0.01" defaultValue={pounds(rule?.unit_base_minor ?? 0)} className={field} />
              </Label>
              <Label text="Area rate (pence per cm²)">
                <input name="areaRate" type="number" step="0.0001" defaultValue={rule?.area_rate_minor_per_cm2 ?? 0} className={field} />
              </Label>
              <Label text="Per character (£)">
                <input name="perCharacter" type="number" step="0.01" defaultValue={pounds(rule?.per_character_minor ?? 0)} className={field} />
              </Label>
              <Label text="Minimum per unit (£)">
                <input name="minUnit" type="number" step="0.01" defaultValue={pounds(rule?.min_unit_minor ?? 0)} className={field} />
              </Label>
            </div>
          </ActionForm>
        </section>

        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <h2 className="mb-3 text-lg font-semibold">Materials</h2>
          <ActionForm action={updateMaterialsAction} hidden={{ productId: product.id }} label="Save materials" variant="primary">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-muted">
                <tr>
                  <th className="pb-1 font-medium">Offer</th>
                  <th className="pb-1 font-medium">Default</th>
                  <th className="pb-1 font-medium">Material</th>
                  <th className="pb-1 text-right font-medium">Price factor</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td className="py-1">
                      <input type="checkbox" name="materialIds" value={m.id} defaultChecked={selected.has(m.id)} aria-label={`Offer ${m.name}`} className="accent-accent" />
                    </td>
                    <td className="py-1">
                      <input type="radio" name="defaultMaterialId" value={m.id} defaultChecked={m.id === defaultMaterial} aria-label={`Default ${m.name}`} className="accent-accent" />
                    </td>
                    <td className="py-1">{m.name}</td>
                    <td className="py-1 text-right text-ink-muted">×{(m.price_factor_bps / 10_000).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ActionForm>
        </section>
      </div>

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <h2 className="mb-1 text-lg font-semibold">Volume discounts for this product</h2>
        <p className="mb-3 text-sm text-ink-muted">
          {tiers.length ? `Overrides the defaults: ${tiers.map((t) => `${t.min_quantity}+ ${formatPercent(t.discount_bps)}`).join(", ")}.` : "Empty: this product uses the default discounts."}
        </p>
        <TiersEditor productId={product.id} tiers={tiers} action={updateTiersAction} />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-sm text-ink-muted">
            Positions are fractions of the print area (0–1), so each template fits every size. Text with a &ldquo;placeholder&rdquo; is filled from
            a spreadsheet column.
          </p>
        </div>
        {templates.map((t) => (
          <article key={t.id} className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 lg:grid-cols-[16rem_1fr]">
            <div className="flex flex-col gap-2">
              {t.svg ? (
                <div className="grid aspect-[4/3] place-items-center rounded bg-[#e2e5ea] p-3 [&>svg]:h-auto [&>svg]:max-h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: t.svg }} />
              ) : (
                <p className="text-sm text-danger">This template is invalid.</p>
              )}
              <ActionForm action={deleteTemplateAction} hidden={{ productId: product.id, templateId: t.id }} label="Delete template" variant="ghost" confirm="Delete permanently" />
            </div>
            <ActionForm action={saveTemplateAction} hidden={{ productId: product.id, templateId: t.id }} label="Save template">
              <div className="flex flex-wrap gap-4">
                <input name="name" defaultValue={t.name} required className={`${field} max-w-xs`} aria-label="Template name" />
                <Check name="isDefault" checked={t.is_default} text="Default" />
                <Check name="isActive" checked={t.is_active} text="Active" />
              </div>
              <textarea name="scene" rows={8} defaultValue={JSON.stringify(t.scene, null, 2)} className={area} spellCheck={false} aria-label="Template JSON" />
            </ActionForm>
          </article>
        ))}
        <details className="rounded-[var(--radius-card)] border border-dashed border-line p-4">
          <summary className="cursor-pointer font-medium text-accent">Add a template</summary>
          <ActionForm action={saveTemplateAction} hidden={{ productId: product.id }} label="Create template" variant="primary" className="mt-3">
            <div className="flex flex-wrap gap-4">
              <input name="name" required placeholder="Template name" className={`${field} max-w-xs`} />
              <Check name="isDefault" checked={false} text="Default" />
              <Check name="isActive" checked text="Active" />
            </div>
            <textarea name="scene" rows={8} defaultValue={SAMPLE_TEMPLATE} className={area} spellCheck={false} aria-label="New template JSON" />
          </ActionForm>
        </details>
      </section>
    </div>
  );
}
