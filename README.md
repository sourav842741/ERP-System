# Marketplace ERP System (MERN Stack)

A complete, production-grade **Marketplace ERP / Central Inventory & Operations Management System** built according to [`plan(1).md`](./plan(1).md).

---

## 🌟 Key Architecture & Features

1. **Single Source of Truth Inventory (`inventoryService.js`)**:
   - Stock is centrally tracked at the `variantId` + `warehouseId` level.
   - `availableStock = physicalStock - reservedStock - damagedStock`.
   - Every mutation creates an immutable entry in the `InventoryTransaction` ledger.
   - Stock cannot go negative (atomic validations).
2. **Order Lifecycle & Automatic Deductions**:
   - Order Creation checks stock and atomically deducts inventory.
   - Order Cancellation automatically restores stock to central inventory.
   - Return Inspection: Good items return to sellable inventory; damaged items move to quarantine.
3. **Purchases & Goods Receiving**:
   - Goods receipt on Purchase Orders automatically increases warehouse stock.
4. **Inter-Warehouse Transfers**:
   - Transfer stock between hubs (e.g. Kolkata Hub -> Delhi Center) with two-sided ledger entries.
5. **Dynamic RBAC**:
   - Custom Role Builder with granular module permission checkboxes.
6. **Multi-Channel Marketplace Listings**:
   - Manage Flipkart, Meesho, Amazon, and Website listings mapped to central SKUs.
7. **Real-time Socket.IO**:
   - Live updates across screens for order creation, stock drops, and low-stock alerts.
8. **Modern SaaS UI**:
   - Responsive layouts, Dark/Light/System themes, and Accent Color customizer.

---

## ⚙️ Environment Configuration

### 1. Server Configuration (`server/.env`)
Copy `server/.env.example` or edit `server/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Paste your MongoDB Atlas URI or keep local MongoDB URI
MONGO_URI=mongodb://127.0.0.1:27017/erp_system

# JWT Secrets
JWT_SECRET=super_secret_jwt_key_erp_2026_xyz!@#
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=super_secret_refresh_jwt_erp_2026_xyz!@#
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary (Optional - leaves local upload fallback if empty)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# SMTP / Gmail (Optional - logs to console safely if empty)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM_NAME="Marketplace ERP"
SMTP_FROM_EMAIL=noreply@erp.local

# Redis / BullMQ (Optional - uses in-memory retry queue with auto-retry if empty)
REDIS_URL=
```

### 2. Client Configuration (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 Getting Started

### Step 1: Database Seeding (Sample Data & Admin Setup)
Once you have entered your `MONGO_URI` in `server/.env`:
```bash
npm run seed
```
This populates:
- **Default Admin Account**:
  - **Email**: `admin@erp.com`
  - **Password**: `adminpassword123`
- Default System Roles & Granular Permissions
- Primary Warehouses (Kolkata Central Hub, Delhi Fulfillment Center)
- Demo Products, Variants, Inventory balances, and Sample Orders

### Step 2: Start Both Backend & Frontend Together (Single Command!)
In your terminal, just run:
```bash
npm run dev
```
Ye ek hi terminal me **Backend (`http://localhost:5000`)** aur **Frontend (`http://localhost:5173`)** dono ko concurrently start kar dega colored logs ke sath!

*(Optional: Agar aap alag-alag terminal me chalana chahein, to `npm run server` aur `npm run client` bhi use kar sakte hain).*
