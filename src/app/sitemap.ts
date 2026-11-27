import type { MetadataRoute } from "next";
import { publicEnv } from "@/config/env.public";
import { ROUTES } from "@/constants/routes";
import * as catalogueController from "@/modules/catalogue/catalogue.controller";

export const revalidate = 3600;

/** Public storefront pages only; accounts, designer, basket and console are private. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const [divisions, products] = await Promise.all([catalogueController.staticDivisionParams(), catalogueController.staticProductParams()]);
  return [
    { url: `${site}${ROUTES.home}`, changeFrequency: "weekly", priority: 1 },
    { url: `${site}${ROUTES.products}`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site}${ROUTES.calculator}`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site}${ROUTES.gallery}`, changeFrequency: "weekly", priority: 0.6 },
    ...divisions.map((d) => ({ url: `${site}${ROUTES.division(d.division)}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${site}${ROUTES.product(p.division, p.product)}`, changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}
