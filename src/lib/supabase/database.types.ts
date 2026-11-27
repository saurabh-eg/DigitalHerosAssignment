
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "csv_datasets": {
                  Row: {
                    "columns": (string)[],"created_at": string,"id": string,"mapping": NonNullable<Json>,"organization_id": string,"row_count": number,"upload_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "columns": (string)[],"created_at"?: string,"id"?: string,"mapping"?: NonNullable<Json>,"organization_id": string,"row_count": number,"upload_id": string
                  }
                  Update: {
                    "columns"?: (string)[],"created_at"?: string,"id"?: string,"mapping"?: NonNullable<Json>,"organization_id"?: string,"row_count"?: number,"upload_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "csv_datasets_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "csv_datasets_upload_id_fkey"
      columns: ["upload_id"]
isOneToOne: false
      referencedRelation: "uploads"
      referencedColumns: ["id"]
    }
                  ]
                },"design_versions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"csv_dataset_id": string | null,"design_id": string,"id": string,"scene": Json | null,"upload_id": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"csv_dataset_id"?: string | null,"design_id": string,"id"?: string,"scene"?: Json | null,"upload_id"?: string | null,"version": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"csv_dataset_id"?: string | null,"design_id"?: string,"id"?: string,"scene"?: Json | null,"upload_id"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "design_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "design_versions_csv_dataset_id_fkey"
      columns: ["csv_dataset_id"]
isOneToOne: false
      referencedRelation: "csv_datasets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "design_versions_design_id_fkey"
      columns: ["design_id"]
isOneToOne: false
      referencedRelation: "designs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "design_versions_upload_id_fkey"
      columns: ["upload_id"]
isOneToOne: false
      referencedRelation: "uploads"
      referencedColumns: ["id"]
    }
                  ]
                },"designs": {
                  Row: {
                    "configuration": NonNullable<Json>,"created_at": string,"created_by": string | null,"current_version": number,"id": string,"is_saved": boolean,"name": string,"organization_id": string,"product_id": string,"source": Database["public"]['Enums']["artwork_source"],"template_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "configuration": NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"current_version"?: number,"id"?: string,"is_saved"?: boolean,"name"?: string,"organization_id": string,"product_id": string,"source"?: Database["public"]['Enums']["artwork_source"],"template_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "configuration"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"current_version"?: number,"id"?: string,"is_saved"?: boolean,"name"?: string,"organization_id"?: string,"product_id"?: string,"source"?: Database["public"]['Enums']["artwork_source"],"template_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "designs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "designs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "designs_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "designs_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "templates"
      referencedColumns: ["id"]
    }
                  ]
                },"divisions": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"image_path": string | null,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"tagline": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"tagline"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"tagline"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"gallery_items": {
                  Row: {
                    "created_at": string,"description": string,"division_id": string,"id": string,"image_path": string,"is_published": boolean,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"division_id": string,"id"?: string,"image_path": string,"is_published"?: boolean,"sort_order"?: number,"title": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"division_id"?: string,"id"?: string,"image_path"?: string,"is_published"?: boolean,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gallery_items_division_id_fkey"
      columns: ["division_id"]
isOneToOne: false
      referencedRelation: "divisions"
      referencedColumns: ["id"]
    }
                  ]
                },"invoice_lines": {
                  Row: {
                    "account_code": string,"description": string,"id": string,"invoice_id": string,"line_amount_minor": number,"quantity": number,"sort_order": number,"tax_minor": number,"tax_type": string,"unit_amount_minor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "account_code": string,"description": string,"id"?: string,"invoice_id": string,"line_amount_minor": number,"quantity": number,"sort_order"?: number,"tax_minor": number,"tax_type": string,"unit_amount_minor": number
                  }
                  Update: {
                    "account_code"?: string,"description"?: string,"id"?: string,"invoice_id"?: string,"line_amount_minor"?: number,"quantity"?: number,"sort_order"?: number,"tax_minor"?: number,"tax_type"?: string,"unit_amount_minor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoice_lines_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    }
                  ]
                },"invoices": {
                  Row: {
                    "contact_email": string,"contact_name": string,"created_at": string,"currency": string,"due_on": string,"exported_at": string | null,"id": string,"invoice_number": string,"issued_on": string,"line_amount_type": string,"net_minor": number,"order_id": string,"pdf_path": string | null,"tax_minor": number,"total_minor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_email": string,"contact_name": string,"created_at"?: string,"currency": string,"due_on"?: string,"exported_at"?: string | null,"id"?: string,"invoice_number"?: string,"issued_on"?: string,"line_amount_type"?: string,"net_minor": number,"order_id": string,"pdf_path"?: string | null,"tax_minor": number,"total_minor": number
                  }
                  Update: {
                    "contact_email"?: string,"contact_name"?: string,"created_at"?: string,"currency"?: string,"due_on"?: string,"exported_at"?: string | null,"id"?: string,"invoice_number"?: string,"issued_on"?: string,"line_amount_type"?: string,"net_minor"?: number,"order_id"?: string,"pdf_path"?: string | null,"tax_minor"?: number,"total_minor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"materials": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"is_active": boolean,"name": string,"price_factor_bps": number,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"name": string,"price_factor_bps"?: number,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"price_factor_bps"?: number,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"order_items": {
                  Row: {
                    "configuration": NonNullable<Json>,"created_at": string,"csv_dataset_id": string | null,"design_id": string | null,"design_version": number | null,"discount_bps": number,"id": string,"line_total_minor": number,"order_id": string,"product_id": string,"product_name": string,"product_type": string,"quantity": number,"setup_fee_minor": number,"tax_minor": number,"unit_price_minor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "configuration": NonNullable<Json>,"created_at"?: string,"csv_dataset_id"?: string | null,"design_id"?: string | null,"design_version"?: number | null,"discount_bps"?: number,"id"?: string,"line_total_minor": number,"order_id": string,"product_id": string,"product_name": string,"product_type": string,"quantity": number,"setup_fee_minor"?: number,"tax_minor"?: number,"unit_price_minor": number
                  }
                  Update: {
                    "configuration"?: NonNullable<Json>,"created_at"?: string,"csv_dataset_id"?: string | null,"design_id"?: string | null,"design_version"?: number | null,"discount_bps"?: number,"id"?: string,"line_total_minor"?: number,"order_id"?: string,"product_id"?: string,"product_name"?: string,"product_type"?: string,"quantity"?: number,"setup_fee_minor"?: number,"tax_minor"?: number,"unit_price_minor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_csv_dataset_id_fkey"
      columns: ["csv_dataset_id"]
isOneToOne: false
      referencedRelation: "csv_datasets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_design_id_fkey"
      columns: ["design_id"]
isOneToOne: false
      referencedRelation: "designs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"order_status_history": {
                  Row: {
                    "changed_by": string | null,"created_at": string,"from_status": Database["public"]['Enums']["order_status"] | null,"id": string,"note": string | null,"order_id": string,"to_status": Database["public"]['Enums']["order_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: string,"note"?: string | null,"order_id": string,"to_status": Database["public"]['Enums']["order_status"]
                  }
                  Update: {
                    "changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: string,"note"?: string | null,"order_id"?: string,"to_status"?: Database["public"]['Enums']["order_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_status_history_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "archived_at": string | null,"completed_at": string | null,"created_at": string,"currency": string,"customer_id": string,"delivery_method": Database["public"]['Enums']["delivery_method"],"delivery_minor": number,"discount_total_minor": number,"files_ready": boolean,"id": string,"items_total_minor": number,"order_number": string,"organization_id": string,"placed_at": string | null,"reorder_of": string | null,"shipping_address": Json | null,"status": Database["public"]['Enums']["order_status"],"tax_minor": number,"total_minor": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"customer_id": string,"delivery_method"?: Database["public"]['Enums']["delivery_method"],"delivery_minor"?: number,"discount_total_minor"?: number,"files_ready"?: boolean,"id"?: string,"items_total_minor"?: number,"order_number"?: string,"organization_id": string,"placed_at"?: string | null,"reorder_of"?: string | null,"shipping_address"?: Json | null,"status"?: Database["public"]['Enums']["order_status"],"tax_minor"?: number,"total_minor"?: number,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"customer_id"?: string,"delivery_method"?: Database["public"]['Enums']["delivery_method"],"delivery_minor"?: number,"discount_total_minor"?: number,"files_ready"?: boolean,"id"?: string,"items_total_minor"?: number,"order_number"?: string,"organization_id"?: string,"placed_at"?: string | null,"reorder_of"?: string | null,"shipping_address"?: Json | null,"status"?: Database["public"]['Enums']["order_status"],"tax_minor"?: number,"total_minor"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_reorder_of_fkey"
      columns: ["reorder_of"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "created_at": string,"member_role": string,"organization_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"member_role"?: string,"organization_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"member_role"?: string,"organization_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organization_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"id": string,"is_personal": boolean,"name": string,"updated_at": string,"vat_number": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_personal"?: boolean,"name": string,"updated_at"?: string,"vat_number"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_personal"?: boolean,"name"?: string,"updated_at"?: string,"vat_number"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount_minor": number,"created_at": string,"currency": string,"id": string,"order_id": string,"provider": string,"provider_payment_intent": string | null,"provider_session_id": string,"status": Database["public"]['Enums']["payment_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"created_at"?: string,"currency": string,"id"?: string,"order_id": string,"provider"?: string,"provider_payment_intent"?: string | null,"provider_session_id": string,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"created_at"?: string,"currency"?: string,"id"?: string,"order_id"?: string,"provider"?: string,"provider_payment_intent"?: string | null,"provider_session_id"?: string,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"pricing_rules": {
                  Row: {
                    "area_rate_minor_per_cm2": number,"min_unit_minor": number,"per_character_minor": number,"product_id": string,"setup_fee_minor": number,"strategy": Database["public"]['Enums']["pricing_strategy"],"unit_base_minor": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_rate_minor_per_cm2"?: number,"min_unit_minor"?: number,"per_character_minor"?: number,"product_id": string,"setup_fee_minor"?: number,"strategy": Database["public"]['Enums']["pricing_strategy"],"unit_base_minor"?: number,"updated_at"?: string
                  }
                  Update: {
                    "area_rate_minor_per_cm2"?: number,"min_unit_minor"?: number,"per_character_minor"?: number,"product_id"?: string,"setup_fee_minor"?: number,"strategy"?: Database["public"]['Enums']["pricing_strategy"],"unit_base_minor"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pricing_rules_product_id_fkey"
      columns: ["product_id"]
isOneToOne: true
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"print_files": {
                  Row: {
                    "created_at": string,"id": string,"kind": Database["public"]['Enums']["print_file_kind"],"order_id": string,"order_item_id": string,"path": string,"print_job_id": string | null,"row_index": number | null,"size_bytes": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["print_file_kind"],"order_id": string,"order_item_id": string,"path": string,"print_job_id"?: string | null,"row_index"?: number | null,"size_bytes"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["print_file_kind"],"order_id"?: string,"order_item_id"?: string,"path"?: string,"print_job_id"?: string | null,"row_index"?: number | null,"size_bytes"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "print_files_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "print_files_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "print_files_print_job_id_fkey"
      columns: ["print_job_id"]
isOneToOne: false
      referencedRelation: "print_jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"print_jobs": {
                  Row: {
                    "attempts": number,"created_at": string,"error": string | null,"id": string,"locked_at": string | null,"order_id": string,"order_item_id": string,"progress_done": number,"progress_total": number,"status": Database["public"]['Enums']["print_job_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"error"?: string | null,"id"?: string,"locked_at"?: string | null,"order_id": string,"order_item_id": string,"progress_done"?: number,"progress_total"?: number,"status"?: Database["public"]['Enums']["print_job_status"],"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"error"?: string | null,"id"?: string,"locked_at"?: string | null,"order_id"?: string,"order_item_id"?: string,"progress_done"?: number,"progress_total"?: number,"status"?: Database["public"]['Enums']["print_job_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "print_jobs_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "print_jobs_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"product_materials": {
                  Row: {
                    "is_default": boolean,"material_id": string,"product_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "is_default"?: boolean,"material_id": string,"product_id": string
                  }
                  Update: {
                    "is_default"?: boolean,"material_id"?: string,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_materials_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_materials_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "bleed_mm": number,"created_at": string,"description": string,"division_id": string,"dpi": number,"id": string,"image_path": string | null,"is_active": boolean,"name": string,"parameters": NonNullable<Json>,"product_type": string,"safe_margin_mm": number,"slug": string,"sort_order": number,"summary": string,"supports_designer": boolean,"supports_upload": boolean,"supports_variable_data": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bleed_mm"?: number,"created_at"?: string,"description"?: string,"division_id": string,"dpi"?: number,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"name": string,"parameters": NonNullable<Json>,"product_type": string,"safe_margin_mm"?: number,"slug": string,"sort_order"?: number,"summary"?: string,"supports_designer"?: boolean,"supports_upload"?: boolean,"supports_variable_data"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "bleed_mm"?: number,"created_at"?: string,"description"?: string,"division_id"?: string,"dpi"?: number,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"name"?: string,"parameters"?: NonNullable<Json>,"product_type"?: string,"safe_margin_mm"?: number,"slug"?: string,"sort_order"?: number,"summary"?: string,"supports_designer"?: boolean,"supports_upload"?: boolean,"supports_variable_data"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_division_id_fkey"
      columns: ["division_id"]
isOneToOne: false
      referencedRelation: "divisions"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "company_name": string | null,"created_at": string,"email": string,"full_name": string | null,"id": string,"is_disabled": boolean,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string,"vat_number": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company_name"?: string | null,"created_at"?: string,"email": string,"full_name"?: string | null,"id": string,"is_disabled"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"vat_number"?: string | null
                  }
                  Update: {
                    "company_name"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string | null,"id"?: string,"is_disabled"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"vat_number"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"proof_events": {
                  Row: {
                    "actor_id": string | null,"comment": string | null,"created_at": string,"event": Database["public"]['Enums']["proof_event_type"],"id": string,"order_id": string,"proof_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"comment"?: string | null,"created_at"?: string,"event": Database["public"]['Enums']["proof_event_type"],"id"?: string,"order_id": string,"proof_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"comment"?: string | null,"created_at"?: string,"event"?: Database["public"]['Enums']["proof_event_type"],"id"?: string,"order_id"?: string,"proof_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proof_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proof_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proof_events_proof_id_fkey"
      columns: ["proof_id"]
isOneToOne: false
      referencedRelation: "proofs"
      referencedColumns: ["id"]
    }
                  ]
                },"proofs": {
                  Row: {
                    "created_at": string,"created_by": string | null,"design_version": number | null,"id": string,"order_id": string,"order_item_id": string,"preview_path": string | null,"status": Database["public"]['Enums']["proof_status"],"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"design_version"?: number | null,"id"?: string,"order_id": string,"order_item_id": string,"preview_path"?: string | null,"status"?: Database["public"]['Enums']["proof_status"],"version": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"design_version"?: number | null,"id"?: string,"order_id"?: string,"order_item_id"?: string,"preview_path"?: string | null,"status"?: Database["public"]['Enums']["proof_status"],"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "proofs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proofs_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proofs_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"tax_settings": {
                  Row: {
                    "currency": string,"id": boolean,"label": string,"prices_include_tax": boolean,"rate_bps": number,"updated_at": string,"xero_tax_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "currency"?: string,"id"?: boolean,"label"?: string,"prices_include_tax"?: boolean,"rate_bps"?: number,"updated_at"?: string,"xero_tax_type"?: string
                  }
                  Update: {
                    "currency"?: string,"id"?: boolean,"label"?: string,"prices_include_tax"?: boolean,"rate_bps"?: number,"updated_at"?: string,"xero_tax_type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"template_groups": {
                  Row: {
                    "created_at": string,"division_id": string,"id": string,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"division_id": string,"id"?: string,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"division_id"?: string,"id"?: string,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "template_groups_division_id_fkey"
      columns: ["division_id"]
isOneToOne: false
      referencedRelation: "divisions"
      referencedColumns: ["id"]
    }
                  ]
                },"templates": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"is_default": boolean,"name": string,"product_id": string,"scene": NonNullable<Json>,"sort_order": number,"template_group_id": string | null,"thumbnail_path": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name": string,"product_id": string,"scene": NonNullable<Json>,"sort_order"?: number,"template_group_id"?: string | null,"thumbnail_path"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"is_default"?: boolean,"name"?: string,"product_id"?: string,"scene"?: NonNullable<Json>,"sort_order"?: number,"template_group_id"?: string | null,"thumbnail_path"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "templates_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "templates_template_group_id_fkey"
      columns: ["template_group_id"]
isOneToOne: false
      referencedRelation: "template_groups"
      referencedColumns: ["id"]
    }
                  ]
                },"uploads": {
                  Row: {
                    "bucket": string,"created_at": string,"height_px": number | null,"id": string,"kind": Database["public"]['Enums']["upload_kind"],"mime_type": string,"needs_preflight": boolean,"organization_id": string,"original_name": string,"path": string,"size_bytes": number,"uploaded_by": string | null,"width_px": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"created_at"?: string,"height_px"?: number | null,"id"?: string,"kind": Database["public"]['Enums']["upload_kind"],"mime_type": string,"needs_preflight"?: boolean,"organization_id": string,"original_name": string,"path": string,"size_bytes": number,"uploaded_by"?: string | null,"width_px"?: number | null
                  }
                  Update: {
                    "bucket"?: string,"created_at"?: string,"height_px"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["upload_kind"],"mime_type"?: string,"needs_preflight"?: boolean,"organization_id"?: string,"original_name"?: string,"path"?: string,"size_bytes"?: number,"uploaded_by"?: string | null,"width_px"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "uploads_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "uploads_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"volume_tiers": {
                  Row: {
                    "discount_bps": number,"id": string,"min_quantity": number,"product_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "discount_bps": number,"id"?: string,"min_quantity": number,"product_id"?: string | null
                  }
                  Update: {
                    "discount_bps"?: number,"id"?: string,"min_quantity"?: number,"product_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "volume_tiers_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "artwork_source": "designer"|"upload","delivery_method": "delivery"|"collection","order_status": "quote"|"order"|"artwork"|"proof"|"production"|"completed"|"cancelled","payment_status": "pending"|"succeeded"|"failed"|"refunded","pricing_strategy": "area"|"per_unit"|"per_character","print_file_kind": "print_pdf"|"print_png"|"merged_pdf"|"row_pdf"|"bundle_zip","print_job_status": "queued"|"running"|"succeeded"|"failed","proof_event_type": "issued"|"approved"|"changes_requested"|"reorder_reused","proof_status": "pending"|"approved"|"changes_requested"|"superseded","upload_kind": "artwork"|"logo"|"csv","user_role": "customer"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "artwork_source": ["designer", "upload"],"delivery_method": ["delivery", "collection"],"order_status": ["quote", "order", "artwork", "proof", "production", "completed", "cancelled"],"payment_status": ["pending", "succeeded", "failed", "refunded"],"pricing_strategy": ["area", "per_unit", "per_character"],"print_file_kind": ["print_pdf", "print_png", "merged_pdf", "row_pdf", "bundle_zip"],"print_job_status": ["queued", "running", "succeeded", "failed"],"proof_event_type": ["issued", "approved", "changes_requested", "reorder_reused"],"proof_status": ["pending", "approved", "changes_requested", "superseded"],"upload_kind": ["artwork", "logo", "csv"],"user_role": ["customer", "admin"]
          }
        }
} as const
