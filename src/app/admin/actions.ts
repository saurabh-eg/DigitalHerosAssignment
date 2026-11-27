"use server";

import type { ActionResult } from "@/lib/action-result";
import * as catalogueAdmin from "@/modules/catalogue/catalogue.admin.controller";
import * as ordersController from "@/modules/orders/orders.controller";
import * as usersController from "@/modules/users/users.controller";

type Form = [ActionResult, FormData];

// Jobs & pipeline
export const adminTransitionAction = async (...a: Form) => ordersController.adminTransition(...a);
export const setArchivedAction = async (...a: Form) => ordersController.setArchived(...a);
export const resumeFulfilmentAction = async (...a: Form) => ordersController.resume(...a);
export const retryPrintJobAction = async (...a: Form) => ordersController.retryPrintJob(...a);
export const runPrintQueueAction = async () => ordersController.runPrintQueue();

// Users
export const setRoleAction = async (...a: Form) => usersController.setRole(...a);
export const setDisabledAction = async (...a: Form) => usersController.setDisabled(...a);

// Catalogue, templates, gallery
export const updateProductAction = async (...a: Form) => catalogueAdmin.updateProduct(...a);
export const updatePricingAction = async (...a: Form) => catalogueAdmin.updatePricing(...a);
export const updateMaterialsAction = async (...a: Form) => catalogueAdmin.updateMaterials(...a);
export const updateTiersAction = async (...a: Form) => catalogueAdmin.updateTiers(...a);
export const createDivisionAction = async (...a: Form) => catalogueAdmin.createDivision(...a);
export const setDivisionActiveAction = async (...a: Form) => catalogueAdmin.setDivisionActive(...a);
export const createProductAction = async (...a: Form) => catalogueAdmin.createProduct(...a);
export const saveTemplateAction = async (...a: Form) => catalogueAdmin.saveTemplate(...a);
export const deleteTemplateAction = async (...a: Form) => catalogueAdmin.deleteTemplate(...a);
export const addGalleryItemAction = async (...a: Form) => catalogueAdmin.addGalleryItem(...a);
export const updateGalleryItemAction = async (...a: Form) => catalogueAdmin.updateGalleryItem(...a);
