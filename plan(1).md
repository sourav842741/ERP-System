# MERN Marketplace ERP --- Complete Development Plan

## 1. Project Overview

Build a production-ready, fully responsive **Marketplace ERP / Inventory
& Operations Management System** using the MERN stack.

The ERP is designed for a business that manages products and listings
across marketplaces such as Flipkart and Meesho, but **marketplace API
synchronization is intentionally NOT part of the current
implementation**.

For the current version:

-   Marketplace orders/listings can be managed manually.
-   Inventory must update automatically when orders, purchases, returns,
    cancellations, damages, or manual adjustments occur.
-   Every screen must display the latest centralized inventory data.
-   Future Flipkart/Meesho/Amazon integrations must be possible without
    redesigning the core system.

The application should feel like a modern SaaS/ERP product rather than a
basic CRUD dashboard.

------------------------------------------------------------------------

# 2. Reference UI / Design Direction

The uploaded reference dashboard should be treated as the primary visual
direction.

## Design characteristics to follow

-   Clean modern SaaS dashboard
-   White/light surfaces with subtle borders
-   Large amount of usable whitespace
-   Compact professional navigation
-   Sidebar/dashboard layout where appropriate
-   Top navigation/header
-   Metric cards
-   Data tables
-   Charts and analytics
-   Small status badges
-   Rounded cards
-   Subtle shadows
-   Thin borders
-   Clean typography
-   Professional enterprise appearance
-   Dense but not cluttered information
-   Responsive desktop/tablet/mobile layouts
-   Clear visual hierarchy

Do NOT make the UI look like a generic admin template.

The final UI should feel like a polished modern ERP product.

------------------------------------------------------------------------

# 3. Technology Stack

## Frontend

-   React.js
-   Vite
-   React Router
-   Redux Toolkit
-   Tailwind CSS
-   Lucide React
-   Axios
-   Socket.IO Client
-   Recharts or another suitable charting library
-   React Hook Form
-   Zod or equivalent validation
-   Sonner / toast notification system
-   Responsive design

## Backend

-   Node.js
-   Express.js
-   MongoDB
-   Mongoose
-   JWT authentication
-   bcrypt
-   Socket.IO
-   Nodemailer
-   SMTP / Gmail SMTP
-   Cloudinary
-   Multer where required
-   Redis
-   BullMQ for background jobs where useful
-   Express validation
-   Helmet
-   CORS
-   Rate limiting

## Infrastructure / Supporting Services

-   MongoDB
-   Redis
-   Cloudinary
-   Gmail SMTP
-   Environment variables
-   Optional Docker support
-   Production-ready logging

------------------------------------------------------------------------

# 4. Core Architecture Principle

The most important rule of this ERP:

## Single Source of Truth for Inventory

Do NOT maintain independent stock values in:

-   Product page
-   Dashboard
-   Listing page
-   Order page
-   Reports

Instead, inventory should have a centralized source.

Example:

``` text
Product
   |
Product Variant
   |
Inventory
   |
Inventory Transactions
```

Every other module reads the latest inventory state.

------------------------------------------------------------------------

# 5. Automatic Inventory System

Inventory must be event-driven from business operations.

## Purchase

``` text
Purchase Received
        ↓
Inventory increases
        ↓
Inventory transaction created
        ↓
Dashboard updates
        ↓
Product stock updates
        ↓
Listing stock display updates
```

## Order Created

``` text
Order Created
        ↓
Check available stock
        ↓
Reserve / decrease stock
        ↓
Create inventory transaction
        ↓
Update dashboard
        ↓
Update product stock
```

## Order Cancelled

``` text
Order Cancelled
        ↓
Stock restored
        ↓
Inventory transaction created
        ↓
All screens show updated stock
```

## Return

``` text
Return Received
        ↓
Inspection
        ↓
Good Condition → Restock
Damaged → Damaged Inventory
```

## Damage

``` text
Damage Recorded
        ↓
Available stock decreases
        ↓
Damaged stock increases
        ↓
Audit log created
```

## Manual Stock Adjustment

Only authorized users can perform this.

``` text
Old Stock
   ↓
Adjustment
   ↓
New Stock
   ↓
Mandatory Reason
   ↓
Audit Log
```

------------------------------------------------------------------------

# 6. Inventory Data Model

Recommended inventory fields:

``` text
variantId
warehouseId
physicalStock
reservedStock
damagedStock
minimumStock
maximumStock
availableStock
createdAt
updatedAt
```

Available stock:

``` text
availableStock =
physicalStock
- reservedStock
- damagedStock
```

For production consistency, derived values should be calculated
centrally and stock mutations should use atomic MongoDB operations /
transactions wherever applicable.

------------------------------------------------------------------------

# 7. Inventory Ledger

Every stock movement must create an immutable inventory transaction.

Transaction types:

``` text
OPENING_STOCK
PURCHASE
SALE
RETURN
ORDER_CANCELLED
DAMAGE
ADJUSTMENT
WAREHOUSE_TRANSFER_IN
WAREHOUSE_TRANSFER_OUT
```

Example:

``` text
T-Shirt / TS-BLK-M

Opening Stock        +100
Purchase              +50
Order #1001            -5
Order #1002           -10
Return                 +2
Damage                 -1
--------------------------------
Current Stock         136
```

Transaction should store:

``` text
variantId
type
quantity
previousStock
newStock
referenceType
referenceId
reason
createdBy
createdAt
```

------------------------------------------------------------------------

# 8. Product Management

Complete CRUD.

## Product fields

``` text
Product Name
SKU
Brand
Category
Subcategory
Description
Short Description
HSN Code
GST
MRP
Cost Price
Selling Price
Weight
Length
Width
Height
Barcode
Status
Images
Variants
```

## Product actions

-   Create
-   Read
-   Update
-   Delete
-   Duplicate
-   Search
-   Filter
-   Sort
-   Bulk update
-   Bulk delete
-   Import
-   Export

------------------------------------------------------------------------

# 9. Product Variant Management

Variants must be first-class entities.

Example:

``` text
T-Shirt

Black / S
Black / M
Black / L
White / S
White / M
White / L
```

Each variant should support:

``` text
SKU
Barcode
Color
Size
Price
Cost
Weight
Images
Inventory
Status
```

------------------------------------------------------------------------

# 10. Category Management

Support:

-   Categories
-   Subcategories
-   Category image
-   Category status
-   Product count
-   Search
-   Sort
-   CRUD

------------------------------------------------------------------------

# 11. Marketplace Listing Management

Marketplace API sync is NOT implemented now.

But the database and UI must be designed so that integrations can be
added later.

Supported marketplace records:

``` text
Flipkart
Meesho
Amazon
Website
Manual
```

Listing fields:

``` text
productId
variantId
marketplace
marketplaceProductId
marketplaceSKU
listingTitle
listingDescription
price
MRP
listingStatus
listingUrl
images
notes
```

The current system should allow the user to manually maintain listing
information.

Future API integrations should plug into a separate marketplace service
layer.

------------------------------------------------------------------------

# 12. Order Management

Orders can be manually entered for now.

Order sources:

``` text
Flipkart
Meesho
Amazon
Website
Manual
```

## Order fields

``` text
Order ID
Source
Customer
Items
Quantity
Subtotal
Discount
Shipping
Tax
Total
Payment Status
Order Status
Shipping Address
Billing Address
Notes
Created By
```

## Order statuses

``` text
PENDING
CONFIRMED
PROCESSING
PACKED
SHIPPED
DELIVERED
CANCELLED
RETURN_REQUESTED
RETURNED
REFUNDED
```

------------------------------------------------------------------------

# 13. Order Automation Rules

When an order is created:

1.  Validate product/variant.
2.  Check available stock.
3.  Prevent negative inventory.
4.  Create order.
5.  Update inventory.
6.  Create inventory transaction.
7.  Emit Socket.IO event.
8.  Update dashboard data.
9.  Create notification where required.
10. Add audit log.

When cancelled:

1.  Change order status.
2.  Restore appropriate stock.
3.  Create transaction.
4.  Emit real-time event.
5.  Add audit log.

All inventory mutations must happen on the backend, never only in the
frontend.

------------------------------------------------------------------------

# 14. Returns Management

Return workflow:

``` text
RETURN_REQUESTED
        ↓
APPROVED
        ↓
RECEIVED
        ↓
INSPECTION
        ↓
RESTOCKED / DAMAGED
        ↓
REFUNDED
```

Return reasons:

-   Wrong product
-   Damaged
-   Defective
-   Size issue
-   Customer changed mind
-   Other

------------------------------------------------------------------------

# 15. Purchase Management

Purchase workflow:

``` text
Supplier
   ↓
Purchase Order
   ↓
Goods Received
   ↓
Inventory Increase
   ↓
Inventory Transaction
```

Features:

-   Purchase CRUD
-   Supplier selection
-   Product/variant selection
-   Quantity
-   Cost
-   Tax
-   Discount
-   Total
-   Partial receiving
-   Purchase status
-   Purchase history
-   Purchase invoice

------------------------------------------------------------------------

# 16. Supplier Management

Supplier fields:

``` text
Name
Company
Phone
Email
GSTIN
Address
Notes
```

Supplier dashboard:

``` text
Total Purchases
Paid Amount
Pending Amount
Last Purchase
Purchase Count
```

------------------------------------------------------------------------

# 17. Warehouse Management

Design this module now even if the first deployment has one warehouse.

Features:

-   Warehouse CRUD
-   Warehouse address
-   Warehouse manager
-   Warehouse stock
-   Stock transfer
-   Transfer history

Transfer:

``` text
Kolkata Warehouse
       ↓
      50
       ↓
Delhi Warehouse
```

Automatically:

``` text
Source -50
Destination +50
```

------------------------------------------------------------------------

# 18. Customer Management

Customer profile:

``` text
Name
Phone
Email
Address
City
State
Postal Code
```

Customer analytics:

``` text
Total Orders
Total Revenue
Returns
Cancelled Orders
Last Order
Average Order Value
```

------------------------------------------------------------------------

# 19. Expense Management

Expense categories:

``` text
Packaging
Shipping
Warehouse
Salary
Advertising
Transportation
Electricity
Software
Marketplace Fees
Other
```

Support:

-   Add expense
-   Edit expense
-   Delete expense
-   Expense categories
-   Date filtering
-   Monthly summary
-   Export

------------------------------------------------------------------------

# 20. Finance / Profit & Loss

Dashboard should show:

``` text
Revenue
Product Cost
Shipping Cost
Marketplace Fees
Packaging
Other Expenses
Estimated Profit
```

Product-level profitability:

``` text
Selling Price
- Product Cost
- Marketplace Fee
- Shipping
- Packaging
= Estimated Profit
```

Clearly label estimates where actual accounting data is not available.

------------------------------------------------------------------------

# 21. Dashboard

Follow the uploaded reference style.

## Top navigation

``` text
Logo / ERP Name

Dashboard
Products
Orders
Inventory
Purchases
Customers
Reports
Insights
Employees
```

User area:

``` text
Notifications
Theme
Profile
```

## Dashboard cards

``` text
Total Sales
Total Orders
Total Products
Available Stock
Low Stock
Out of Stock
Pending Orders
Returns
Estimated Profit
```

## Dashboard sections

### Sales & Profit

Line chart:

``` text
Revenue
Costs
Profit
```

### Inventory Overview

``` text
Healthy Stock
Low Stock
Out of Stock
Damaged
```

### Orders Overview

``` text
Pending
Processing
Shipped
Delivered
Cancelled
Returned
```

### Recent Orders

Table with:

``` text
Order
Customer
Marketplace
Amount
Status
Date
```

### Low Stock Products

Table:

``` text
Product
SKU
Stock
Minimum
Status
Action
```

### Recent Activity

``` text
User created product
Order created
Stock adjusted
Purchase received
Return processed
```

------------------------------------------------------------------------

# 22. Reports

## Sales Reports

-   Daily
-   Weekly
-   Monthly
-   Yearly
-   Custom date range

## Inventory Reports

-   Current stock
-   Low stock
-   Out of stock
-   Damaged stock
-   Stock movement
-   Fast moving
-   Slow moving
-   Dead stock

## Order Reports

-   Pending
-   Delivered
-   Cancelled
-   Returned
-   Marketplace-wise

## Purchase Reports

-   Supplier-wise
-   Product-wise
-   Date-wise

## Finance Reports

-   Revenue
-   Expenses
-   Profit
-   Purchase cost

Export:

``` text
CSV
Excel
PDF
```

------------------------------------------------------------------------

# 23. Notifications

In-app notification center.

Types:

``` text
NEW_ORDER
LOW_STOCK
OUT_OF_STOCK
RETURN_RECEIVED
ORDER_CANCELLED
PURCHASE_RECEIVED
PAYMENT_PENDING
SYSTEM_ERROR
```

Notifications should support:

-   Read/unread
-   Mark all read
-   Delete/clear where appropriate
-   Role-based delivery

------------------------------------------------------------------------

# 24. Socket.IO Real-Time System

Socket.IO should be used for important live updates.

Example:

``` text
Order Manager creates order
        ↓
Backend updates inventory
        ↓
Socket.IO event
        ↓
Dashboard
Inventory page
Product page
Order page
```

Events:

``` text
order:created
order:updated
order:cancelled

inventory:updated
inventory:low
inventory:out

purchase:created
purchase:received

return:created
return:processed

notification:new
```

Use rooms where useful:

``` text
admin-room
inventory-room
orders-room
warehouse-room
```

Do not use Socket.IO as the source of truth. MongoDB remains the source
of truth.

------------------------------------------------------------------------

# 25. RBAC --- Fully Customizable

Do not create only fixed roles.

The system should support:

``` text
Roles
Permissions
Users
Role Assignment
```

## Permission format

``` text
dashboard:view

product:create
product:read
product:update
product:delete

inventory:view
inventory:adjust
inventory:transfer

order:create
order:read
order:update
order:cancel

purchase:create
purchase:read
purchase:update

customer:create
customer:read
customer:update

report:view
report:export

user:create
user:read
user:update
user:delete

settings:view
settings:update
```

## Custom Role Builder

Admin can:

``` text
Create Role
        ↓
Enter Role Name
        ↓
Select Permissions
        ↓
Save
```

Example:

``` text
Role: Inventory Supervisor

Products:
✓ Read
✓ Create
✓ Update
✗ Delete

Inventory:
✓ View
✓ Adjust
✓ Transfer

Orders:
✓ Read
✗ Create
✗ Cancel
```

------------------------------------------------------------------------

# 26. Authentication

Implement:

-   Login
-   Logout
-   Register
-   Forgot Password
-   Reset Password
-   Email verification
-   Refresh token
-   Session management
-   Password change
-   Account status

Security:

-   bcrypt password hashing
-   JWT access token
-   Refresh token
-   HTTP-only cookies where appropriate
-   Helmet
-   CORS
-   Rate limiting
-   Input validation

------------------------------------------------------------------------

# 27. SMTP / Gmail Email System

Use Gmail SMTP through Nodemailer.

Email use cases:

``` text
Password Reset
Email Verification
New Order
Low Stock
Out of Stock
Return
Purchase Received
Daily Report
Weekly Report
```

Admin settings:

``` text
SMTP Host
SMTP Port
SMTP Username
SMTP Password
From Name
From Email
```

Important:

-   Never expose SMTP credentials to frontend.
-   Keep credentials in environment variables or securely encrypted
    configuration.
-   Add a "Send Test Email" action.
-   Log email delivery attempts and failures.

------------------------------------------------------------------------

# 28. Cloudinary Image Management

All product images should use Cloudinary.

Flow:

``` text
React
  ↓
Backend upload endpoint
  ↓
Cloudinary
  ↓
URL + publicId
  ↓
MongoDB
```

Features:

-   Multiple images
-   Main image
-   Product gallery
-   Variant images
-   Image delete
-   Image replacement
-   Image reorder
-   Cloudinary optimization

Do not store image binary data inside MongoDB.

------------------------------------------------------------------------

# 29. Excel Import / Export

Import:

``` text
Products
Customers
Suppliers
Inventory
```

Flow:

``` text
Upload
 ↓
Validate
 ↓
Preview
 ↓
Show Errors
 ↓
Confirm
 ↓
Import
```

Export:

``` text
Products
Inventory
Orders
Purchases
Sales
Customers
Suppliers
Expenses
Reports
```

------------------------------------------------------------------------

# 30. Audit Logs

Every sensitive action must be logged.

Examples:

``` text
Product Created
Product Updated
Product Deleted
Price Changed
Stock Adjusted
Order Created
Order Cancelled
Return Processed
Purchase Received
User Created
Role Changed
Permission Changed
Settings Changed
Login
Logout
```

Audit record:

``` text
userId
action
module
entityId
oldValue
newValue
reason
ip
userAgent
createdAt
```

Audit logs should be viewable by authorized administrators.

------------------------------------------------------------------------

# 31. Global Search

Add a global search in the top bar.

Search:

``` text
Products
SKU
Orders
Customers
Suppliers
Invoices
```

Example:

``` text
Search: TS-BLK-M

Results:
Product
Inventory
Listings
Orders
Stock History
```

------------------------------------------------------------------------

# 32. Advanced Filters

Every major table should support:

-   Search
-   Date range
-   Status
-   Category
-   Marketplace
-   Warehouse
-   User
-   Price range
-   Stock range

Use URL query parameters so filters can be shared/bookmarked.

------------------------------------------------------------------------

# 33. Bulk Actions

Tables should support:

``` text
Select All

Bulk Delete
Bulk Status Update
Bulk Category Update
Bulk Price Update
Bulk Export
```

Permissions must be checked before bulk actions.

------------------------------------------------------------------------

# 34. Appearance / Theme System

The application should have a customizable appearance system.

## Themes

Support:

``` text
Light
Dark
System
```

## Accent Color

Allow users/admins to choose an accent color.

Example presets:

``` text
Blue
Purple
Green
Orange
Red
Cyan
```

Use CSS variables / Tailwind theme tokens rather than hardcoding colors.

Example concept:

``` text
--primary
--primary-foreground
--background
--foreground
--card
--border
--muted
```

## Appearance settings

``` text
Theme
Accent Color
Sidebar Style
Compact / Comfortable Density
Border Radius
```

Persist user preferences.

------------------------------------------------------------------------

# 35. Responsive Design

The entire application must be responsive.

## Desktop

Full dashboard:

``` text
Sidebar
Content
Charts
Tables
```

## Tablet

``` text
Collapsible Sidebar
Responsive Grid
Scrollable Tables
```

## Mobile

``` text
Mobile Header
Drawer Navigation
Stacked Cards
Horizontal table scrolling
Bottom/quick actions where appropriate
```

Do not simply shrink desktop UI. Build responsive layouts intentionally.

------------------------------------------------------------------------

# 36. UI Component System

Create reusable components.

``` text
Button
Input
Select
Combobox
Modal
Drawer
Dropdown
Tooltip
Badge
Tabs
Card
Table
Pagination
DataTable
DatePicker
Chart
StatCard
EmptyState
Skeleton
LoadingState
ErrorState
ConfirmDialog
ImageUploader
FileUploader
CommandPalette
```

Use Lucide React icons consistently.

------------------------------------------------------------------------

# 37. Loading / Empty / Error States

Every important page must handle:

``` text
Loading
Empty
Error
Success
Permission Denied
Not Found
```

Example:

``` text
No products found.

[ Add Product ]
```

Never leave blank screens.

------------------------------------------------------------------------

# 38. Backend API Architecture

Recommended structure:

``` text
server/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── validators/
│   ├── utils/
│   ├── jobs/
│   ├── queues/
│   ├── sockets/
│   └── app.js
│
└── server.js
```

Architecture:

``` text
Route
 ↓
Middleware
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
MongoDB
```

Business logic should primarily live in services rather than route
files.

------------------------------------------------------------------------

# 39. Frontend Architecture

``` text
src/
│
├── components/
├── pages/
├── layouts/
├── features/
│   ├── auth/
│   ├── products/
│   ├── inventory/
│   ├── orders/
│   ├── purchases/
│   ├── customers/
│   ├── suppliers/
│   ├── reports/
│   └── settings/
│
├── store/
├── hooks/
├── services/
├── utils/
├── constants/
├── routes/
└── styles/
```

Use feature-based organization for large modules.

------------------------------------------------------------------------

# 40. Database Collections

Recommended initial collections:

``` text
users
roles
permissions

products
productVariants
categories

inventory
inventoryTransactions

orders
orderItems
returns

customers

suppliers
purchaseOrders
purchaseItems

warehouses
warehouseTransfers

marketplaces
marketplaceListings

expenses
payments

notifications
auditLogs

emailLogs
settings
userPreferences
```

------------------------------------------------------------------------

# 41. Database Relationships

Main relationship:

``` text
Product
   ↓
Product Variant
   ↓
Inventory
```

Orders:

``` text
Customer
   ↓
Order
   ↓
Order Items
   ↓
Product Variant
   ↓
Inventory
```

Purchases:

``` text
Supplier
   ↓
Purchase Order
   ↓
Purchase Items
   ↓
Product Variant
   ↓
Inventory
```

------------------------------------------------------------------------

# 42. Marketplace Architecture for Future

DO NOT implement marketplace API synchronization now.

But prepare abstraction:

``` text
MarketplaceService
│
├── FlipkartService
├── MeeshoService
├── AmazonService
└── ShopifyService
```

Current:

``` text
Manual Marketplace Listing
```

Future:

``` text
Marketplace API
      ↓
Marketplace Service
      ↓
ERP Order Service
      ↓
Inventory Service
```

This prevents marketplace-specific logic from entering core
inventory/order code.

------------------------------------------------------------------------

# 43. Background Jobs

Use Redis + BullMQ where asynchronous processing is useful.

Possible queues:

``` text
EMAIL_QUEUE
REPORT_QUEUE
IMAGE_QUEUE
NOTIFICATION_QUEUE
```

Future:

``` text
MARKETPLACE_SYNC_QUEUE
```

Do not introduce unnecessary queues for simple synchronous CRUD
operations.

------------------------------------------------------------------------

# 44. Business Rules

Important rules:

### Inventory

``` text
Stock cannot become negative.
```

### Order

``` text
Order cannot be created if available stock is insufficient.
```

### Cancellation

``` text
Cancelled order restores stock only when stock was previously deducted/reserved.
```

### Return

``` text
Good returned items can return to sellable inventory.
Damaged returned items go to damaged inventory.
```

### Manual Adjustment

``` text
Reason is mandatory.
```

### Delete

Prefer soft deletion for important business entities.

``` text
isDeleted
deletedAt
deletedBy
```

Do not hard-delete financial/order/inventory history casually.

------------------------------------------------------------------------

# 45. Dashboard Visual Language

Reference screenshot should guide:

## Cards

-   Rounded corners
-   Thin border
-   Subtle shadow
-   Compact metric
-   Small comparison text
-   Optional mini chart

## Charts

-   Minimal grid
-   Clear labels
-   Tooltips
-   Responsive
-   Date range controls

## Tables

-   Clean header
-   Checkbox selection
-   Status badges
-   Row actions
-   Pagination
-   Search
-   Filters

## Colors

Use a neutral base with configurable accent color.

Example status colors:

``` text
Success → green
Warning → amber
Error → red
Info → blue
Neutral → gray
```

Do not overuse bright colors.

------------------------------------------------------------------------

# 46. Security Requirements

Implement:

-   Password hashing
-   JWT validation
-   Role/permission middleware
-   Input validation
-   MongoDB query sanitization
-   Rate limiting
-   Helmet
-   CORS configuration
-   Secure cookies where applicable
-   Environment variables
-   Secure file upload validation
-   Audit logs
-   Permission checks on backend
-   API error sanitization

Never trust frontend permissions alone.

------------------------------------------------------------------------

# 47. API Versioning

Use:

``` text
/api/v1/
```

Example:

``` text
/api/v1/auth
/api/v1/products
/api/v1/inventory
/api/v1/orders
/api/v1/purchases
/api/v1/customers
/api/v1/reports
```

This makes future API changes easier.

------------------------------------------------------------------------

# 48. Error Handling

Use centralized error handling.

Response format:

``` json
{
  "success": false,
  "message": "Insufficient stock",
  "code": "INSUFFICIENT_STOCK"
}
```

Success:

``` json
{
  "success": true,
  "message": "Order created successfully",
  "data": {}
}
```

------------------------------------------------------------------------

# 49. Implementation Phases

## Phase 1 --- Foundation

``` text
Project setup
React + Vite
Tailwind
Express
MongoDB
Authentication
RBAC
Theme system
Layouts
Reusable UI components
```

## Phase 2 --- Product

``` text
Products
Categories
Variants
Cloudinary
Search
Filters
Bulk actions
```

## Phase 3 --- Inventory

``` text
Inventory
Stock transactions
Automatic stock updates
Low stock
Out of stock
Adjustments
Audit logs
```

## Phase 4 --- Orders

``` text
Orders
Order items
Order status
Automatic inventory deduction
Cancellation
Returns
Customers
Socket.IO updates
```

## Phase 5 --- Purchase

``` text
Suppliers
Purchase orders
Receiving
Automatic stock increase
Supplier history
```

## Phase 6 --- Warehouse

``` text
Warehouses
Warehouse stock
Transfers
Transfer history
```

## Phase 7 --- Finance

``` text
Expenses
Payments
Profit/Loss
Invoices
Reports
```

## Phase 8 --- Communication

``` text
Notifications
SMTP
Gmail
Email templates
Email logs
Scheduled reports
```

## Phase 9 --- Analytics

``` text
Dashboard
Sales analytics
Inventory analytics
Product performance
Profit analytics
```

## Phase 10 --- Marketplace Preparation

``` text
Marketplace listings
Manual listing management
Marketplace abstraction
Integration-ready service layer
```

## Future Phase

``` text
Flipkart API
Meesho API
Amazon API
Automatic marketplace synchronization
```

------------------------------------------------------------------------

# 50. Final Navigation

Recommended main navigation:

``` text
Dashboard

Products
  ├── All Products
  ├── Add Product
  ├── Categories
  └── Variants

Inventory
  ├── Overview
  ├── Stock
  ├── Transactions
  ├── Low Stock
  ├── Damaged
  └── Adjustments

Orders
  ├── All Orders
  ├── Pending
  ├── Processing
  ├── Shipped
  ├── Delivered
  ├── Cancelled
  └── Returns

Marketplace
  ├── Listings
  ├── Flipkart
  ├── Meesho
  └── Other

Purchases
  ├── Purchase Orders
  ├── Suppliers
  └── Receiving

Warehouse
  ├── Warehouses
  ├── Stock
  └── Transfers

Customers

Finance
  ├── Revenue
  ├── Expenses
  ├── Payments
  └── Profit & Loss

Reports

Insights

Notifications

Employees
  ├── Users
  ├── Roles
  └── Permissions

Settings
  ├── General
  ├── Appearance
  ├── Email / SMTP
  ├── Cloudinary
  └── System
```

------------------------------------------------------------------------

# 51. MVP Definition

The first production-ready version should contain:

``` text
✓ Authentication
✓ Fully customizable RBAC
✓ Dashboard
✓ Products
✓ Categories
✓ Variants
✓ Cloudinary
✓ Central Inventory
✓ Automatic Inventory Updates
✓ Inventory Ledger
✓ Orders
✓ Returns
✓ Customers
✓ Suppliers
✓ Purchases
✓ Warehouse
✓ Marketplace Manual Listings
✓ Notifications
✓ Audit Logs
✓ Reports
✓ Expenses
✓ Profit/Loss
✓ Invoice
✓ Excel Import/Export
✓ SMTP Gmail
✓ Socket.IO
✓ Dark/Light/System Theme
✓ Custom Accent Colors
✓ Fully Responsive UI
✓ Modern SaaS UI
```

Not in current version:

``` text
✗ Flipkart API sync
✗ Meesho API sync
✗ Amazon API sync
✗ Automatic marketplace order sync
✗ Automatic marketplace stock sync
```

These must be added later through the prepared marketplace service
abstraction.

------------------------------------------------------------------------

# 52. Final Product Goal

The final system should behave like:

``` text
                 ERP
                  │
       ┌──────────┼──────────┐
       ↓          ↓          ↓
    Products    Orders    Purchases
       │          │          │
       └──────────┼──────────┘
                  ↓
             INVENTORY
                  │
        ┌─────────┼─────────┐
        ↓         ↓         ↓
    Dashboard  Listings   Reports
        │
        ↓
     Analytics

Users
  ↓
RBAC
  ↓
Permissions

Actions
  ↓
Audit Logs

Important Events
  ↓
Socket.IO
  ↓
Real-time UI

Email Events
  ↓
BullMQ
  ↓
SMTP/Gmail
```

## Core principle

**User performs the business action once. The ERP handles the connected
updates automatically.**

Example:

``` text
Create Order: Qty 5
        ↓
Inventory -5
        ↓
Ledger created
        ↓
Dashboard updated
        ↓
Product stock updated
        ↓
Listing stock display updated
        ↓
Low-stock rule checked
        ↓
Notification created
        ↓
Socket.IO broadcasts update
        ↓
Audit log created
```

This is the central behavior that should define the entire application.
