export interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  barcode?: string;
  buyingPrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
}

export type PaymentStatus = 'paid' | 'partial' | 'credit';

export interface SaleRecord {
  id: string;
  // Multiple line items recorded in the same checkout share a transactionId,
  // so they can be grouped on one receipt and paid off together.
  transactionId: string;
  date: string;
  itemName: string;
  quantitySold: number;
  totalRevenue: number;
  totalProfit: number;
  customerId?: string;
  customerName?: string;
  paymentStatus: PaymentStatus;
  amountPaid: number;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

// A logged restock — separate from just nudging currentStock, so cost and
// supplier history isn't lost.
export interface Purchase {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export type UserRole = 'owner' | 'staff';
export type MembershipStatus = 'approved' | 'pending';

export interface TeamMember {
  id: string; // equals userId — kept as `id` so it works with the generic array-merge machinery
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  status: MembershipStatus;
  joinedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export type Tab = 'dashboard' | 'inventory' | 'sales' | 'debtors' | 'expenses' | 'notes' | 'reports' | 'activity' | 'settings';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface AppSettings {
  businessName: string;
  currency: string;
}

export type SortDirection = 'asc' | 'desc';

export interface InventorySort {
  key: keyof Pick<InventoryItem, 'name' | 'buyingPrice' | 'sellingPrice' | 'currentStock'>;
  direction: SortDirection;
}

export interface BackupPayload {
  exportedAt: string;
  inventory: InventoryItem[];
  sales: SaleRecord[];
  notes: Note[];
  settings: AppSettings;
  expenses: Expense[];
  purchases: Purchase[];
  customers: Customer[];
}

// One line the shopper is currently building up before checkout.
export interface CartLine {
  itemId: string;
  itemName: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  availableStock: number;
}
