export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURNED: 'RETURNED',
  REFUNDED: 'REFUNDED'
};

export const ORDER_SOURCES = {
  FLIPKART: 'Flipkart',
  MEESHO: 'Meesho',
  AMAZON: 'Amazon',
  WEBSITE: 'Website',
  MANUAL: 'Manual'
};

export const INVENTORY_TRANSACTION_TYPES = {
  OPENING_STOCK: 'OPENING_STOCK',
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  RETURN: 'RETURN',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  DAMAGE: 'DAMAGE',
  ADJUSTMENT: 'ADJUSTMENT',
  WAREHOUSE_TRANSFER_IN: 'WAREHOUSE_TRANSFER_IN',
  WAREHOUSE_TRANSFER_OUT: 'WAREHOUSE_TRANSFER_OUT'
};

export const PURCHASE_STATUSES = {
  ORDERED: 'ORDERED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED'
};

export const EXPENSE_CATEGORIES = [
  'Packaging',
  'Shipping',
  'Warehouse',
  'Salary',
  'Advertising',
  'Transportation',
  'Electricity',
  'Software',
  'Marketplace Fees',
  'Other'
];

export const NOTIFICATION_TYPES = {
  NEW_ORDER: 'NEW_ORDER',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  RETURN_RECEIVED: 'RETURN_RECEIVED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  PURCHASE_RECEIVED: 'PURCHASE_RECEIVED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
};

export const DEFAULT_PERMISSIONS = [
  { code: 'dashboard:view', name: 'View Dashboard', category: 'Dashboard' },
  
  { code: 'product:create', name: 'Create Product', category: 'Products' },
  { code: 'product:read', name: 'View Products', category: 'Products' },
  { code: 'product:update', name: 'Update Product', category: 'Products' },
  { code: 'product:delete', name: 'Delete Product', category: 'Products' },

  { code: 'inventory:view', name: 'View Inventory', category: 'Inventory' },
  { code: 'inventory:adjust', name: 'Adjust Stock Manually', category: 'Inventory' },
  { code: 'inventory:transfer', name: 'Transfer Between Warehouses', category: 'Inventory' },

  { code: 'order:create', name: 'Create Order', category: 'Orders' },
  { code: 'order:read', name: 'View Orders', category: 'Orders' },
  { code: 'order:update', name: 'Update Order / Status', category: 'Orders' },
  { code: 'order:cancel', name: 'Cancel Order', category: 'Orders' },

  { code: 'purchase:create', name: 'Create Purchase Order', category: 'Purchases' },
  { code: 'purchase:read', name: 'View Purchases', category: 'Purchases' },
  { code: 'purchase:update', name: 'Receive Purchases', category: 'Purchases' },

  { code: 'customer:create', name: 'Create Customer', category: 'Customers' },
  { code: 'customer:read', name: 'View Customers', category: 'Customers' },
  { code: 'customer:update', name: 'Update Customer', category: 'Customers' },
  { code: 'customer:delete', name: 'Delete Customer', category: 'Customers' },

  { code: 'marketplace:read', name: 'View Marketplace Listings', category: 'Marketplace' },
  { code: 'marketplace:manage', name: 'Manage Marketplace Listings', category: 'Marketplace' },

  { code: 'finance:view', name: 'View Financials & Expenses', category: 'Finance' },
  { code: 'finance:manage', name: 'Manage Expenses', category: 'Finance' },

  { code: 'report:view', name: 'View Reports', category: 'Reports' },
  { code: 'report:export', name: 'Export Reports (CSV/Excel)', category: 'Reports' },

  { code: 'user:create', name: 'Create Employee / User', category: 'Employees & Roles' },
  { code: 'user:read', name: 'View Employees', category: 'Employees & Roles' },
  { code: 'user:update', name: 'Update Employees', category: 'Employees & Roles' },
  { code: 'user:delete', name: 'Delete Employees', category: 'Employees & Roles' },

  { code: 'settings:view', name: 'View Settings', category: 'Settings' },
  { code: 'settings:update', name: 'Update Settings', category: 'Settings' }
];
