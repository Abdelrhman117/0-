import { Timestamp } from 'firebase/firestore';

// ─── Inventory ────────────────────────────────────────────────────────────────
export type InventoryCategory = 'raw' | 'roasted' | 'packaging';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;      // kg  (or units for packaging)
  unit: string;          // 'kg' | 'bag' | 'box' ...
  lowStockThreshold: number;
  origin?: string;       // for raw beans
  notes?: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  country: string;
  contactName?: string;
  email?: string;
  phone?: string;
  totalPurchased: number;
  createdAt: Timestamp;
}

// ─── Supply Shipments ─────────────────────────────────────────────────────────
export interface SupplyShipment {
  id: string;
  supplierId: string;
  supplierName: string;
  inventoryItemId: string;
  itemName: string;
  weightKg: number;
  costPerKg: number;
  totalCost: number;
  currency: string;
  date: Timestamp;
  notes?: string;
  createdAt: Timestamp;
}

// ─── Roasting Batches ─────────────────────────────────────────────────────────
export interface RoastingBatch {
  id: string;
  batchNumber: string;
  rawItemId: string;
  rawItemName: string;
  roastedItemId: string;
  roastedItemName: string;
  rawWeightKg: number;
  roastedWeightKg: number;
  shrinkagePct: number;
  roastProfile: 'light' | 'medium' | 'medium-dark' | 'dark';
  temperatureC: number;
  durationMin: number;
  roasterName: string;
  notes?: string;
  date: Timestamp;
  createdAt: Timestamp;
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export type ClientType = 'local' | 'export';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  country: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  balance: number;
  totalOrders: number;
  totalVolumeKg: number;
  createdAt: Timestamp;
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  inventoryItemId: string;
  itemName: string;
  quantityKg: number;
  pricePerKg: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  clientType: ClientType;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  status: OrderStatus;
  notes?: string;
  date: Timestamp;
  createdAt: Timestamp;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: Timestamp;
  date: Timestamp;
  createdAt: Timestamp;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  rawStockKg: number;
  roastedStockKg: number;
  activeOrders: number;
  monthlyRevenue: number;
  lowStockItems: InventoryItem[];
  recentBatches: RoastingBatch[];
  recentOrders: Order[];
}
