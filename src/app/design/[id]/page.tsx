import type { Metadata } from "next";
import * as designerController from "@/modules/designer/designer.controller";
import { Designer } from "@/modules/designer/components/designer";
import { addToCartAction } from "../../cart/actions";
import { registerAssetAction, saveCsvMappingAction, saveDraftAction, saveVersionAction } from "../actions";

export const metadata: Metadata = { title: "Designer" };

export default async function DesignPage({ params, searchParams }: PageProps<"/design/[id]">) {
  const [{ id }, { panel }] = await Promise.all([params, searchParams]);
  const view = await designerController.getDesignForPage(id);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <Designer
        view={view}
        initialTab={typeof panel === "string" ? panel : undefined}
        actions={{
          saveDraft: saveDraftAction,
          registerAsset: registerAssetAction,
          saveCsvMapping: saveCsvMappingAction,
          saveVersion: saveVersionAction,
          addToCart: addToCartAction,
        }}
      />
    </main>
  );
}
