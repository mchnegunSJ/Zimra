export type UserRole = 'manager' | 'cashier';

export interface User {
  id: string;
  name: string;
  pin: string;
  role: UserRole;
}

export interface Product {
  id: string;
  name: string;
  price: number; // Price is stored as a number (e.g., 10.99)
  taxInclusive: boolean;
  taxRate: number; // 15% as 0.15
}

export interface CartItem extends Product {
  quantity: number;
  total: number;
  taxAmount: number;
}

export interface Receipt {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  timestamp: string;
  cashier: string;
}

export interface FiscalDay {
  isOpen: boolean;
  date: string;
  openedAt: string;
  closedAt: string | null;
  totalSales: number;
  totalTax: number;
  receiptCount: number;
}

export interface DeviceStatus {
  isConfigured: boolean;
  deviceId: string | null;
  serialNo: string | null;
  csrStatus: 'Not Generated' | 'Generated' | 'Registered';
  certificate: string | null;
}

export type AppState = {
  user: User | null;
  fiscalDay: FiscalDay | null;
  deviceStatus: DeviceStatus;
  cart: CartItem[];
  products: Product[];
  users: User[];
};
