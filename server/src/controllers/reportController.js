import { Order } from '../models/Order.js';
import { Inventory } from '../models/Inventory.js';
import { Product } from '../models/Product.js';
import { Expense } from '../models/Expense.js';
import { AuditLog } from '../models/AuditLog.js';
import { ORDER_STATUSES } from '../config/constants.js';

// ================= DASHBOARD METRICS & CHARTS =================
export const getDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Multi-Timeframe Revenue & Orders
    const timePeriodsAggregate = await Order.aggregate([
      { $match: { isDeleted: false, orderStatus: { $ne: ORDER_STATUSES.CANCELLED } } },
      {
        $facet: {
          today: [
            { $match: { createdAt: { $gte: startOfToday } } },
            { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
          ],
          thisWeek: [
            { $match: { createdAt: { $gte: startOfWeek } } },
            { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
          ],
          thisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
          ],
          allTime: [
            {
              $group: {
                _id: null,
                revenue: { $sum: '$total' },
                orders: { $sum: 1 },
                cost: {
                  $sum: {
                    $reduce: {
                      input: '$items',
                      initialValue: 0,
                      in: { $add: ['$$value', { $multiply: [{ $ifNull: ['$$this.costPrice', 0] }, '$$this.quantity'] }] }
                    }
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    const facet = timePeriodsAggregate[0] || {};
    const todayData = facet.today?.[0] || { revenue: 0, orders: 0 };
    const weekData = facet.thisWeek?.[0] || { revenue: 0, orders: 0 };
    const monthData = facet.thisMonth?.[0] || { revenue: 0, orders: 0 };
    const allTimeData = facet.allTime?.[0] || { revenue: 0, orders: 0, cost: 0 };

    // 2. Total Products
    const totalProducts = await Product.countDocuments({ isDeleted: false });

    // 3. Central Inventory Health
    const invAggregate = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalAvailableStock: { $sum: '$availableStock' },
          totalPhysicalStock: { $sum: '$physicalStock' },
          totalDamagedStock: { $sum: '$damagedStock' },
          lowStockCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$availableStock', 0] }, { $lte: ['$availableStock', '$minimumStock'] }] },
                1,
                0
              ]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$availableStock', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    const invData = invAggregate[0] || { totalAvailableStock: 0, totalPhysicalStock: 0, totalDamagedStock: 0, lowStockCount: 0, outOfStockCount: 0 };

    // 4. Pending Orders & Returns
    const [pendingOrders, returnOrders] = await Promise.all([
      Order.countDocuments({ isDeleted: false, orderStatus: { $in: [ORDER_STATUSES.PENDING, ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.PROCESSING] } }),
      Order.countDocuments({ isDeleted: false, orderStatus: { $in: [ORDER_STATUSES.RETURN_REQUESTED, ORDER_STATUSES.RETURNED] } })
    ]);

    // 5. Total Expenses
    const expenseAggregate = await Expense.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = expenseAggregate[0]?.total || 0;

    // 6. Estimated Profit = AllTime Revenue - Product Cost - Expenses
    const estimatedProfit = Math.max(0, allTimeData.revenue - (allTimeData.cost || 0) - totalExpenses);

    // 7. Recent 6 Orders with enriched items
    const recentOrders = await Order.find({ isDeleted: false })
      .select('orderNumber source total orderStatus createdAt customerSnapshot items')
      .sort({ createdAt: -1 })
      .limit(6);

    // 8. Low Stock Items (top 5 alerts)
    const lowStockProducts = await Inventory.find({
      $expr: {
        $and: [
          { $gt: ['$availableStock', 0] },
          { $lte: ['$availableStock', '$minimumStock'] }
        ]
      }
    })
      .populate('productId', 'name sku brand images')
      .populate('variantId', 'sku color size')
      .populate('warehouseId', 'name')
      .limit(5);

    // 9. Recent System Activities / Audit (last 12)
    const recentActivities = await AuditLog.find().sort({ createdAt: -1 }).limit(12);

    // 10. 30-Day Sales & Orders Timeline
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dailyOrders = await Order.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: thirtyDaysAgo },
          orderStatus: { $ne: ORDER_STATUSES.CANCELLED }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Build complete 30 days & 7 days timelines
    const timeline30D = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = dailyOrders.find((o) => o._id === dateStr);
      const rev = match ? match.revenue : 0;
      const profit = Math.round(rev * 0.32);
      timeline30D.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: dateStr,
        revenue: rev,
        profit: profit,
        orders: match ? match.orderCount : 0
      });
    }

    const timeline7D = timeline30D.slice(-7);

    // 11. Marketplace Channel Distribution
    const marketplaceAggregate = await Order.aggregate([
      { $match: { isDeleted: false, orderStatus: { $ne: ORDER_STATUSES.CANCELLED } } },
      {
        $group: {
          _id: '$source',
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    const channelColors = {
      Flipkart: '#2563eb',
      Amazon: '#f59e0b',
      Meesho: '#ec4899',
      Website: '#10b981',
      Manual: '#6366f1'
    };

    const marketplaceShare = marketplaceAggregate.map((m) => ({
      name: m._id || 'Direct',
      value: m.revenue,
      orders: m.orders,
      color: channelColors[m._id] || '#8b5cf6'
    }));

    // If empty, provide baseline channels so chart always renders beautifully
    if (!marketplaceShare.length) {
      marketplaceShare.push(
        { name: 'Flipkart', value: 0, orders: 0, color: '#2563eb' },
        { name: 'Amazon', value: 0, orders: 0, color: '#f59e0b' },
        { name: 'Meesho', value: 0, orders: 0, color: '#ec4899' },
        { name: 'Manual', value: 0, orders: 0, color: '#6366f1' }
      );
    }

    // 12. Order Status Breakdown (Fulfillment Pipeline)
    const statusAggregate = await Order.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusMap = statusAggregate.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    const orderFulfillment = [
      { status: 'Pending', count: statusMap.PENDING || 0, fill: '#eab308' },
      { status: 'Confirmed', count: statusMap.CONFIRMED || 0, fill: '#3b82f6' },
      { status: 'Processing', count: statusMap.PROCESSING || 0, fill: '#6366f1' },
      { status: 'Shipped', count: statusMap.SHIPPED || 0, fill: '#8b5cf6' },
      { status: 'Delivered', count: statusMap.DELIVERED || 0, fill: '#10b981' },
      { status: 'Cancelled', count: statusMap.CANCELLED || 0, fill: '#ef4444' },
      { status: 'Returned', count: statusMap.RETURNED || 0, fill: '#64748b' }
    ];

    // 13. Top Performing Products
    const topProductsAggregate = await Order.aggregate([
      { $match: { isDeleted: false, orderStatus: { $ne: ORDER_STATUSES.CANCELLED } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.title' },
          sku: { $first: '$items.sku' },
          unitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDoc'
        }
      }
    ]);

    const topProducts = topProductsAggregate.map((p) => {
      const doc = p.productDoc?.[0];
      return {
        _id: p._id,
        name: doc?.name || p.name,
        sku: doc?.sku || p.sku,
        unitsSold: p.unitsSold,
        totalRevenue: p.totalRevenue,
        image: doc?.images?.[0]?.url || ''
      };
    });

    res.json({
      success: true,
      data: {
        revenueTimeframes: {
          today: { revenue: todayData.revenue, orders: todayData.orders },
          thisWeek: { revenue: weekData.revenue, orders: weekData.orders },
          thisMonth: { revenue: monthData.revenue, orders: monthData.orders },
          allTime: { revenue: allTimeData.revenue, orders: allTimeData.orders }
        },
        kpis: {
          totalSales: allTimeData.revenue,
          totalOrders: allTimeData.orders,
          totalProducts,
          availableStock: invData.totalAvailableStock,
          lowStockCount: invData.lowStockCount,
          outOfStockCount: invData.outOfStockCount,
          pendingOrders,
          returnsCount: returnOrders,
          totalExpenses,
          estimatedProfit
        },
        chartData: timeline7D,
        timeline7D,
        timeline30D,
        marketplaceShare,
        orderFulfillment,
        topProducts,
        recentOrders,
        lowStockProducts,
        recentActivities
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= CUSTOM REPORTS & CSV EXPORT =================
export const getFinanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    const matchOrder = { isDeleted: false, orderStatus: { $ne: ORDER_STATUSES.CANCELLED } };
    const matchExpense = { isDeleted: false };
    if (startDate || endDate) {
      matchOrder.createdAt = dateQuery;
      matchExpense.date = dateQuery;
    }

    const [orderSum] = await Order.aggregate([
      { $match: matchOrder },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          shippingFees: { $sum: '$shippingFee' },
          taxes: { $sum: '$tax' },
          discounts: { $sum: '$discount' },
          totalOrders: { $sum: 1 }
        }
      }
    ]) || [{ revenue: 0, shippingFees: 0, taxes: 0, discounts: 0, totalOrders: 0 }];

    const expenseBreakdown = await Expense.aggregate([
      { $match: matchExpense },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);

    const totalExpense = expenseBreakdown.reduce((sum, b) => sum + b.total, 0);
    const revenue = orderSum?.revenue || 0;
    const netProfit = revenue - totalExpense;

    res.json({
      success: true,
      data: {
        revenue,
        totalExpense,
        netProfit,
        orderMetrics: orderSum || { revenue: 0, totalOrders: 0 },
        expenseBreakdown
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportReportCSV = async (req, res) => {
  try {
    const { type } = req.params; // 'orders', 'inventory', 'expenses', 'products'
    let csvHeader = '';
    let csvRows = [];

    if (type === 'orders') {
      csvHeader = 'Order Number,Source,Customer Name,Phone,Total Amount,Order Status,Payment Status,Date\n';
      const orders = await Order.find({ isDeleted: false }).sort({ createdAt: -1 });
      csvRows = orders.map((o) => `"${o.orderNumber}","${o.source}","${o.customerSnapshot?.name || ''}","${o.customerSnapshot?.phone || ''}","${o.total}","${o.orderStatus}","${o.paymentStatus}","${new Date(o.createdAt).toISOString()}"`);
    } else if (type === 'inventory') {
      csvHeader = 'Product,SKU,Warehouse,Physical Stock,Available Stock,Damaged Stock,Min Stock\n';
      const invs = await Inventory.find()
        .populate('productId', 'name sku')
        .populate('variantId', 'sku')
        .populate('warehouseId', 'name');
      csvRows = invs.map((i) => `"${i.productId?.name || ''}","${i.variantId?.sku || i.productId?.sku || ''}","${i.warehouseId?.name || ''}","${i.physicalStock}","${i.availableStock}","${i.damagedStock}","${i.minimumStock}"`);
    } else if (type === 'expenses') {
      csvHeader = 'Title,Category,Amount,Payment Method,Date\n';
      const expenses = await Expense.find({ isDeleted: false }).sort({ date: -1 });
      csvRows = expenses.map((e) => `"${e.title}","${e.category}","${e.amount}","${e.paymentMethod}","${new Date(e.date).toISOString()}"`);
    } else {
      csvHeader = 'Name,SKU,Brand,Price,Cost,Status\n';
      const prods = await Product.find({ isDeleted: false }).sort({ createdAt: -1 });
      csvRows = prods.map((p) => `"${p.name}","${p.sku}","${p.brand || ''}","${p.sellingPrice}","${p.costPrice}","${p.status}"`);
    }

    const csvContent = csvHeader + csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="erp_${type}_export_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
