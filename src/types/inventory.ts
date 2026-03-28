// ─── MOVEMENT TYPES ────────────────────────────────────────────────────────────
export type MovementType = 'GRN' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'DISPATCH' | 'RETURN' | 'OPENING';

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  GRN:        'Goods Received',
  SALE:       'Sale',
  ADJUSTMENT: 'Adjustment',
  TRANSFER:   'Transfer',
  DISPATCH:   'Dispatch',
  RETURN:     'Return',
  OPENING:    'Opening Stock',
};

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  GRN:        'text-emerald-400 bg-emerald-400/10',
  SALE:       'text-sky-400 bg-sky-400/10',
  ADJUSTMENT: 'text-amber-400 bg-amber-400/10',
  TRANSFER:   'text-violet-400 bg-violet-400/10',
  DISPATCH:   'text-orange-400 bg-orange-400/10',
  RETURN:     'text-teal-400 bg-teal-400/10',
  OPENING:    'text-zinc-400 bg-zinc-400/10',
};

// ─── STOCK STATUS ──────────────────────────────────────────────────────────────
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export function getStockStatus(current: number, reorderLevel: number): StockStatus {
  if (current <= 0) return 'out_of_stock';
  if (current <= reorderLevel) return 'low_stock';
  return 'in_stock';
}

// ─── ENTITY TYPES ──────────────────────────────────────────────────────────────
export interface UOMType {
  id:           string;
  name:         string;
  abbreviation: string;
}

export interface SubCategoryType {
  id:          string;
  name:        string;
  category_id: string;
}

export interface CategoryType {
  id:             string;
  name:           string;
  description:    string | null;
  color:          string | null;
  sub_categories: SubCategoryType[];
}

export interface BrandType {
  id:          string;
  name:        string;
  description: string | null;
}

export interface SupplierType {
  id:           string;
  name:         string;
  contact_name: string | null;
  email:        string | null;
  phone:        string | null;
  address:      string | null;
  notes:        string | null;
  is_active:    boolean;
  created_at:   string;
}

export interface BarcodeType {
  id:         string;
  barcode:    string;
  is_primary: boolean;
}

export interface ProductType {
  id:                    string;
  item_code:             string;
  name:                  string;
  description:           string | null;
  vehicle_compatibility: string | null;

  category_id:     string | null;
  sub_category_id: string | null;
  brand_id:        string | null;
  supplier_id:     string | null;

  cost_price:      number;
  retail_price:    number;
  wholesale_price: number;
  min_price:       number;

  current_stock: number;
  reorder_level: number;
  reorder_qty:   number;
  track_stock:   boolean;

  base_uom_id:       string | null;
  bulk_uom_id:       string | null;
  bulk_qty:          number;
  bulk_cost_price:   number;
  bulk_retail_price: number;

  is_active:  boolean;
  created_at: string;
  updated_at: string;

  category:     CategoryType | null;
  sub_category: SubCategoryType | null;
  brand:        BrandType | null;
  supplier:     SupplierType | null;
  base_uom:     UOMType | null;
  bulk_uom:     UOMType | null;
  barcodes:     BarcodeType[];
}

export interface GRNItemType {
  id:         string;
  product_id: string;
  quantity:   number;
  cost_price: number;
  total:      number;
  product:    Pick<ProductType, 'id' | 'item_code' | 'name'>;
}

export interface GRNType {
  id:          string;
  grn_number:  string;
  supplier_id: string | null;
  total_cost:  number;
  notes:       string | null;
  status:      string;
  created_at:  string;
  supplier:    Pick<SupplierType, 'id' | 'name'> | null;
  items:       GRNItemType[];
}

export interface StockMovementType {
  id:         string;
  product_id: string;
  type:       MovementType;
  quantity:   number;
  balance:    number;
  reference:  string | null;
  notes:      string | null;
  cost_price: number | null;
  created_at: string;
  product:    Pick<ProductType, 'id' | 'item_code' | 'name'>;
}

export interface BatchType {
  id:            string;
  product_id:    string;
  batch_number:  string;
  grn_id:        string | null;
  quantity:      number;
  remaining_qty: number;
  cost_price:    number;
  created_at:    string;
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
export interface InventoryDashboardStats {
  total_products:      number;
  active_products:     number;
  out_of_stock:        number;
  low_stock:           number;
  total_stock_value:   number;
  total_retail_value:  number;
  recent_movements:    StockMovementType[];
  low_stock_items:     ProductType[];
}
