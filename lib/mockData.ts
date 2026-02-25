// ─── Employees ────────────────────────────────────────────────────────────────
export type AttendanceRecord = Record<string, 'present' | 'absent'>;

export interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  attendance: AttendanceRecord; // key: "YYYY-MM-DD", value: present | absent
  // v1.1 extended fields
  salary?: number;
  dateOfJoining?: string;
  salaryDeductionRules?: string;
  email?: string;
  phone?: string;
  aadhaar?: string;
  overtime?: Record<string, boolean>; // key: "YYYY-MM-DD", value: true = overtime
}

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Ramesh Patil',    role: 'Head Chef',        avatar: 'RP', attendance: {} },
  { id: 'e2', name: 'Sunita Jadhav',   role: 'Sous Chef',        avatar: 'SJ', attendance: {} },
  { id: 'e3', name: 'Vikram Desai',    role: 'Waiter',           avatar: 'VD', attendance: {} },
  { id: 'e4', name: 'Pooja Nair',      role: 'Cashier',          avatar: 'PN', attendance: {} },
  { id: 'e5', name: 'Arjun Rao',       role: 'Kitchen Helper',   avatar: 'AR', attendance: {} },
  { id: 'e6', name: 'Meera Shah',      role: 'Floor Manager',    avatar: 'MS', attendance: {} },
];

// ─── Catalogue (Menu) ─────────────────────────────────────────────────────────
export type MenuCategory = 'Chinese' | 'Continental' | 'Mocktail' | 'Biryani' | 'Dessert';

export interface CatalogueItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  description?: string;
  available: boolean;
}

export const MENU_CATEGORIES: MenuCategory[] = ['Chinese', 'Continental', 'Mocktail', 'Biryani', 'Dessert'];

export const INITIAL_CATALOGUE: CatalogueItem[] = [
  // Chinese
  { id: 'cat1',  name: 'Veg Fried Rice',         category: 'Chinese',     price: 180, description: 'Wok-tossed rice with mixed vegetables',   available: true },
  { id: 'cat2',  name: 'Chicken Fried Rice',      category: 'Chinese',     price: 220, description: 'Classic Chinese fried rice with chicken',  available: true },
  { id: 'cat3',  name: 'Veg Manchurian Gravy',    category: 'Chinese',     price: 200, description: 'Crispy balls in spicy Manchurian sauce',    available: true },
  { id: 'cat4',  name: 'Chicken Manchurian',      category: 'Chinese',     price: 250, description: 'Crispy chicken in dark soya sauce',         available: true },
  { id: 'cat5',  name: 'Hakka Noodles (Veg)',     category: 'Chinese',     price: 170, description: 'Stir-fried noodles with vegetables',        available: true },
  { id: 'cat6',  name: 'Chilli Paneer',           category: 'Chinese',     price: 230, description: 'Cottage cheese tossed in chilli sauce',     available: true },
  // Continental
  { id: 'cat7',  name: 'Grilled Veg Sandwich',    category: 'Continental', price: 150, description: 'Toasted sandwich with grilled vegetables',  available: true },
  { id: 'cat8',  name: 'Chicken Burger',          category: 'Continental', price: 220, description: 'Grilled chicken patty with lettuce & mayo', available: true },
  { id: 'cat9',  name: 'Penne Arrabbiata',        category: 'Continental', price: 260, description: 'Penne pasta in spicy tomato sauce',         available: true },
  { id: 'cat10', name: 'Margherita Pizza',        category: 'Continental', price: 320, description: '7-inch pizza with tomato and mozzarella',   available: true },
  { id: 'cat11', name: 'French Fries',            category: 'Continental', price: 130, description: 'Crispy golden fries with seasoning',        available: true },
  // Mocktail
  { id: 'cat12', name: 'Virgin Mojito',           category: 'Mocktail',    price: 120, description: 'Mint, lime, soda — refreshing classic',     available: true },
  { id: 'cat13', name: 'Blue Lagoon',             category: 'Mocktail',    price: 140, description: 'Blue curacao, lemon-lime soda & ice',       available: true },
  { id: 'cat14', name: 'Watermelon Cooler',       category: 'Mocktail',    price: 130, description: 'Fresh watermelon blended with mint',        available: true },
  { id: 'cat15', name: 'Mango Tango',             category: 'Mocktail',    price: 150, description: 'Mango pulp, ginger ale & lime',             available: true },
  // Biryani
  { id: 'cat16', name: 'Veg Dum Biryani',         category: 'Biryani',     price: 220, description: 'Fragrant basmati with spiced vegetables',    available: true },
  { id: 'cat17', name: 'Chicken Biryani',         category: 'Biryani',     price: 280, description: 'Hyderabadi-style dum chicken biryani',       available: true },
  { id: 'cat18', name: 'Egg Biryani',             category: 'Biryani',     price: 240, description: 'Spiced biryani with boiled eggs',            available: true },
  { id: 'cat19', name: 'Paneer Biryani',          category: 'Biryani',     price: 260, description: 'Cottage cheese cooked in biryani masala',    available: true },
  // Dessert
  { id: 'cat20', name: 'Gulab Jamun',             category: 'Dessert',     price: 100, description: 'Soft milk-solid dumplings in sugar syrup',   available: true },
  { id: 'cat21', name: 'Brownie with Ice Cream',  category: 'Dessert',     price: 180, description: 'Warm chocolate brownie + vanilla scoop',     available: true },
  { id: 'cat22', name: 'Mango Sorbet',            category: 'Dessert',     price: 140, description: 'Chilled mango sorbet with fresh fruits',     available: true },
  { id: 'cat23', name: 'Cold Coffee',             category: 'Dessert',     price: 160, description: 'Creamy blended iced coffee',                 available: true },
];

// ─── Bills (replaces Invoices for cafe context) ───────────────────────────────
export interface InvoiceItem {
  description: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  client: string;           // Customer name (walk-in / reservation)
  date: string;
  dueDate: string;          // Same as date for cafe bills
  items: InvoiceItem[];
  status: 'Paid' | 'Pending';
  // Cafe-specific fields
  tableNo?: string;
  orderType?: 'Dine-In' | 'Takeaway' | 'Delivery';
  paymentMode?: 'Cash' | 'Card' | 'UPI';
  // contact fields (optional for delivery orders)
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
}

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv1', invoiceNo: 'BILL-001', client: 'Walk-in', date: '2026-02-01', dueDate: '2026-02-01',
    tableNo: 'T-3', orderType: 'Dine-In', paymentMode: 'Cash',
    items: [
      { description: 'Chicken Biryani', qty: 2, price: 280 },
      { description: 'Virgin Mojito',   qty: 2, price: 120 },
    ],
    status: 'Paid',
  },
  {
    id: 'inv2', invoiceNo: 'BILL-002', client: 'Rahul Sharma', date: '2026-02-05', dueDate: '2026-02-05',
    tableNo: 'T-7', orderType: 'Dine-In', paymentMode: 'Card',
    items: [
      { description: 'Margherita Pizza',       qty: 1, price: 320 },
      { description: 'Chilli Paneer',          qty: 1, price: 230 },
      { description: 'Brownie with Ice Cream', qty: 2, price: 180 },
    ],
    status: 'Paid',
  },
  {
    id: 'inv3', invoiceNo: 'BILL-003', client: 'Priya S', date: '2026-02-10', dueDate: '2026-02-10',
    tableNo: 'T-1', orderType: 'Dine-In', paymentMode: 'UPI',
    items: [
      { description: 'Veg Dum Biryani', qty: 2, price: 220 },
      { description: 'Mango Tango',      qty: 2, price: 150 },
      { description: 'Gulab Jamun',      qty: 2, price: 100 },
    ],
    status: 'Paid',
  },
  {
    id: 'inv4', invoiceNo: 'BILL-004', client: 'Delivery Order', date: '2026-02-14', dueDate: '2026-02-14',
    orderType: 'Delivery', clientPhone: '9876543210',
    items: [
      { description: 'Chicken Fried Rice',  qty: 1, price: 220 },
      { description: 'Chicken Manchurian',  qty: 1, price: 250 },
    ],
    status: 'Pending',
  },
  {
    id: 'inv5', invoiceNo: 'BILL-005', client: 'Walk-in', date: '2026-02-18', dueDate: '2026-02-18',
    tableNo: 'T-5', orderType: 'Dine-In',
    items: [
      { description: 'Penne Arrabbiata',  qty: 1, price: 260 },
      { description: 'Blue Lagoon',       qty: 2, price: 140 },
      { description: 'French Fries',      qty: 1, price: 130 },
    ],
    status: 'Pending',
  },
];

// ─── Transactions ─────────────────────────────────────────────────────────────
export type TransactionType = 'Income' | 'Expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  note: string;
}

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1',  type: 'Income',  category: 'Dine-In Sales',    amount: 1400,  date: '2026-02-01', note: 'BILL-001 — Table T-3' },
  { id: 't2',  type: 'Expense', category: 'Raw Materials',    amount: 4500,  date: '2026-02-02', note: 'Weekly vegetables & spices purchase' },
  { id: 't3',  type: 'Income',  category: 'Dine-In Sales',    amount: 1090,  date: '2026-02-05', note: 'BILL-002 — Rahul Sharma' },
  { id: 't4',  type: 'Expense', category: 'Staff Salaries',   amount: 52000, date: '2026-02-10', note: 'February salaries — kitchen & service' },
  { id: 't5',  type: 'Income',  category: 'Dine-In Sales',    amount: 940,   date: '2026-02-10', note: 'BILL-003 — Table T-1' },
  { id: 't6',  type: 'Expense', category: 'Utilities',        amount: 3800,  date: '2026-02-12', note: 'Electricity & LPG cylinders' },
  { id: 't7',  type: 'Expense', category: 'Raw Materials',    amount: 5200,  date: '2026-02-15', note: 'Chicken, paneer & dairy restocking' },
  { id: 't8',  type: 'Expense', category: 'Packaging',        amount: 1200,  date: '2026-02-16', note: 'Takeaway boxes & carry bags' },
  { id: 't9',  type: 'Income',  category: 'Takeaway Sales',   amount: 670,   date: '2026-02-18', note: 'BILL-005 — Walk-in takeaway' },
  { id: 't10', type: 'Expense', category: 'Maintenance',      amount: 2500,  date: '2026-02-20', note: 'Kitchen equipment servicing' },
];

// ─── Inventory (Kitchen Stock / Raw Materials) ────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  openingQty: number;
  currentQty: number;
  purchasePrice: number;
  sellingPrice: number;
  reorderLevel: number;
  gstRate: number; // %
}

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'it1', name: 'Basmati Rice',       sku: 'GRN-BSMT-25', category: 'Grains',     unit: 'Kg',    openingQty: 50,  currentQty: 32,  purchasePrice: 80,  sellingPrice: 0, reorderLevel: 10, gstRate: 5  },
  { id: 'it2', name: 'Chicken (Fresh)',    sku: 'MT-CHK-01',   category: 'Meat',       unit: 'Kg',    openingQty: 20,  currentQty: 8,   purchasePrice: 220, sellingPrice: 0, reorderLevel: 5,  gstRate: 5  },
  { id: 'it3', name: 'Paneer',             sku: 'DRY-PNR-01',  category: 'Dairy',      unit: 'Kg',    openingQty: 10,  currentQty: 4,   purchasePrice: 280, sellingPrice: 0, reorderLevel: 2,  gstRate: 5  },
  { id: 'it4', name: 'Tomatoes',           sku: 'VEG-TOM-01',  category: 'Vegetables', unit: 'Kg',    openingQty: 15,  currentQty: 7,   purchasePrice: 30,  sellingPrice: 0, reorderLevel: 3,  gstRate: 0  },
  { id: 'it5', name: 'Onions',             sku: 'VEG-ONI-01',  category: 'Vegetables', unit: 'Kg',    openingQty: 20,  currentQty: 12,  purchasePrice: 25,  sellingPrice: 0, reorderLevel: 5,  gstRate: 0  },
  { id: 'it6', name: 'Cooking Oil',        sku: 'OIL-COK-05',  category: 'Oils',       unit: 'Litre', openingQty: 20,  currentQty: 9,   purchasePrice: 140, sellingPrice: 0, reorderLevel: 4,  gstRate: 5  },
  { id: 'it7', name: 'LPG Cylinder',       sku: 'GAS-LPG-01',  category: 'Utilities',  unit: 'Nos',   openingQty: 5,   currentQty: 2,   purchasePrice: 920, sellingPrice: 0, reorderLevel: 1,  gstRate: 5  },
  { id: 'it8', name: 'Maida (All Purpose)',sku: 'GRN-MDA-10',  category: 'Grains',     unit: 'Kg',    openingQty: 25,  currentQty: 14,  purchasePrice: 45,  sellingPrice: 0, reorderLevel: 5,  gstRate: 5  },
  { id: 'it9', name: 'Fresh Cream',        sku: 'DRY-CRM-01',  category: 'Dairy',      unit: 'Kg',    openingQty: 5,   currentQty: 2,   purchasePrice: 320, sellingPrice: 0, reorderLevel: 1,  gstRate: 5  },
  { id: 'it10',name: 'Soya Sauce',         sku: 'SOS-SOY-01',  category: 'Condiments', unit: 'Litre', openingQty: 4,   currentQty: 2,   purchasePrice: 90,  sellingPrice: 0, reorderLevel: 1,  gstRate: 12 },
];

// ─── Chart Data ───────────────────────────────────────────────────────────────
export const REVENUE_CHART_DATA = [
  { month: 'Sep', revenue: 82000,  expenses: 61000 },
  { month: 'Oct', revenue: 94000,  expenses: 67000 },
  { month: 'Nov', revenue: 88000,  expenses: 63000 },
  { month: 'Dec', revenue: 115000, expenses: 74000 },
  { month: 'Jan', revenue: 105000, expenses: 70000 },
  { month: 'Feb', revenue: 72000,  expenses: 69200 },
];

export const EXPENSE_PIE_DATA = [
  { name: 'Staff Salaries',  value: 52000, color: '#3b82f6' },
  { name: 'Raw Materials',   value: 9700,  color: '#06b6d4' },
  { name: 'Utilities',       value: 3800,  color: '#8b5cf6' },
  { name: 'Packaging',       value: 1200,  color: '#f59e0b' },
  { name: 'Maintenance',     value: 2500,  color: '#22c55e' },
];

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const DASHBOARD_STATS = {
  totalRevenue: 72000,
  totalExpenses: 69200,
  netProfit: 2800,
  pendingPayments: 970,
};
