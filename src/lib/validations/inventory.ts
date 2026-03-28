import { z } from 'zod';

// ─── CATEGORY ──────────────────────────────────────────────────────────────────
export const categorySchema = z.object({
  name:        z.string().min(1, 'Name is required').max(100),
  description: z.string().nullable().optional(),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').default('#6366f1'),
});
export const categoryUpdateSchema = categorySchema.partial();

// ─── SUB-CATEGORY ──────────────────────────────────────────────────────────────
export const subCategorySchema = z.object({
  name:        z.string().min(1, 'Name is required').max(100),
  category_id: z.string().min(1, 'Category is required'),
});

// ─── BRAND ─────────────────────────────────────────────────────────────────────
export const brandSchema = z.object({
  name:        z.string().min(1, 'Brand name is required').max(100),
  description: z.string().nullable().optional(),
  logo_url:    z.string().nullable().optional(),
});
export const brandUpdateSchema = brandSchema.partial();

// ─── SUPPLIER ──────────────────────────────────────────────────────────────────
export const supplierSchema = z.object({
  name:         z.string().min(1, 'Supplier name is required').max(200),
  contact_name: z.string().nullable().optional(),
  email:        z.string().email('Invalid email').nullable().optional().or(z.literal('')),
  phone:        z.string().nullable().optional(),
  address:      z.string().nullable().optional(),
  notes:        z.string().nullable().optional(),
  is_active:    z.boolean().default(true),
});
export const supplierUpdateSchema = supplierSchema.partial();

// ─── UOM ───────────────────────────────────────────────────────────────────────
export const uomSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(50),
  abbreviation: z.string().min(1, 'Abbreviation is required').max(10),
});

// ─── PRODUCT ───────────────────────────────────────────────────────────────────
// Base object (used for partial/update schema — superRefine doesn't support .partial())
const productBaseObject = z.object({
    item_code:             z.string().min(1, 'Item code is required').max(50),
    name:                  z.string().min(1, 'Item name is required').max(200),
    description:           z.string().nullable().optional(),
    vehicle_compatibility: z.string().nullable().optional(),

    // Classification
    category_id:     z.string().nullable().optional(),
    sub_category_id: z.string().nullable().optional(),
    brand_id:        z.string().nullable().optional(),
    supplier_id:     z.string().nullable().optional(),

    // Pricing
    cost_price:      z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be ≥ 0').default(0),
    retail_price:    z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be ≥ 0').default(0),
    wholesale_price: z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be ≥ 0').default(0),
    min_price:       z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be ≥ 0').default(0),

    // Inventory
    current_stock: z.number().min(0).default(0),
    reorder_level: z.number().min(0).default(5),
    reorder_qty:   z.number().min(0).default(10),
    track_stock:   z.boolean().default(true),

    // UOM / Secondary unit
    base_uom_id:       z.string().nullable().optional(),
    bulk_uom_id:       z.string().nullable().optional(),
    bulk_qty:          z.number().min(1, 'Must be ≥ 1').default(1),
    bulk_cost_price:   z.number().min(0).default(0),
    bulk_retail_price: z.number().min(0).default(0),

    is_active: z.boolean().default(true),
    barcodes:  z.array(z.string().min(1)).optional().default([]),
  });

export const productSchema = productBaseObject.superRefine((data, ctx) => {
    // Rule: cost ≤ min_price (when min_price > 0)
    if (data.min_price > 0 && data.cost_price > data.min_price) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: 'Minimum price must be ≥ cost price',
        path:    ['min_price'],
      });
    }
    // Rule: min_price ≤ retail_price (when both > 0)
    if (data.retail_price > 0 && data.min_price > data.retail_price) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: 'Retail price must be ≥ minimum price',
        path:    ['retail_price'],
      });
    }
    // Rule: wholesale between cost and retail (when both set)
    if (data.wholesale_price > 0 && data.retail_price > 0 && data.wholesale_price > data.retail_price) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: 'Wholesale price should not exceed retail price',
        path:    ['wholesale_price'],
      });
    }
  });

export const productUpdateSchema = productBaseObject.partial();

// ─── GRN ───────────────────────────────────────────────────────────────────────
export const grnItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity:   z.number().min(0.01, 'Quantity must be > 0'),
  cost_price: z.number().min(0, 'Cost price must be >= 0'),
  total:      z.number().min(0),
});

export const grnSchema = z.object({
  supplier_id:    z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  received_date:  z.string().nullable().optional(),
  notes:          z.string().nullable().optional(),
  items:          z.array(grnItemSchema).min(1, 'At least one item is required'),
});

// ─── STOCK ADJUSTMENT ──────────────────────────────────────────────────────────
export const stockAdjustmentSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  type:       z.enum(['ADJUSTMENT', 'DISPATCH', 'RETURN', 'OPENING']),
  quantity:   z.number().min(0.01, 'Quantity must be > 0'),
  notes:      z.string().nullable().optional(),
  reference:  z.string().nullable().optional(),
});

// ─── INFERRED TYPES ────────────────────────────────────────────────────────────
export type CategoryInput    = z.infer<typeof categorySchema>;
export type SubCategoryInput = z.infer<typeof subCategorySchema>;
export type BrandInput       = z.infer<typeof brandSchema>;
export type SupplierInput    = z.infer<typeof supplierSchema>;
export type UOMInput         = z.infer<typeof uomSchema>;
export type ProductInput     = z.infer<typeof productSchema>;
export type GRNInput         = z.infer<typeof grnSchema>;
export type GRNItemInput     = z.infer<typeof grnItemSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustmentSchema>;
