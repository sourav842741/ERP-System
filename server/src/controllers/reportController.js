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

    // 2. Total Products (Only active non-deleted products)
    const totalProducts = await Product.countDocuments({ isDeleted: false });
    const activeProducts = await Product.find({ isDeleted: false }).select('_id name sku brand images');
    const activeProductIds = activeProducts.map((p) => p._id);

    // 3. Central Inventory Health - STRICTLY FOR ACTIVE PRODUCTS
    const invAggregate = await Inventory.aggregate([
      { $match: { productId: { $in: activeProductIds } } },
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

    // 8. Low Stock Items (top 6 alerts) - STRICTLY FOR REAL ACTIVE PRODUCTS
    const lowStockRaw = await Inventory.find({
      productId: { $in: activeProductIds },
      $expr: {
        $lte: ['$availableStock', '$minimumStock']
      }
    })
      .populate('productId', 'name sku brand images isDeleted')
      .populate('variantId', 'sku color size')
      .populate('warehouseId', 'name')
      .sort({ availableStock: 1 })
      .limit(6);

    const lowStockProducts = lowStockRaw.filter((item) => item.productId && !item.productId.isDeleted);

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

    // 13. Top Performing Products - ONLY ACTIVE NON-DELETED PRODUCTS
    const topProductsAggregate = await Order.aggregate([
      { $match: { isDeleted: false, orderStatus: { $ne: ORDER_STATUSES.CANCELLED } } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $in: activeProductIds } } },
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

    const salesMap = new Map();
    topProductsAggregate.forEach((p) => {
      const doc = p.productDoc?.[0];
      if (doc && !doc.isDeleted) {
        salesMap.set(String(p._id), {
          _id: p._id,
          name: doc.name || p.name,
          sku: doc.sku || p.sku,
          unitsSold: p.unitsSold,
          totalRevenue: p.totalRevenue,
          image: doc.images?.[0]?.url || ''
        });
      }
    });

    const topProducts = [];
    salesMap.forEach((val) => topProducts.push(val));

    // If fewer than 5 products have sales, supplement with remaining real active products
    if (topProducts.length < 5) {
      for (const prod of activeProducts) {
        if (topProducts.length >= 5) break;
        if (!salesMap.has(String(prod._id))) {
          topProducts.push({
            _id: prod._id,
            name: prod.name,
            sku: prod.sku,
            unitsSold: 0,
            totalRevenue: 0,
            image: prod.images?.[0]?.url || ''
          });
        }
      }
    }

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

// ================= FULL ANALYTICS SUITE (REAL-TIME) =================
export const getAnalyticsReport = async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (range === '7d') {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (range === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (range === '12m') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
    } else {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    }

    // 1. Only active non-deleted products
    const activeProducts = await Product.find({ isDeleted: false })
      .select('_id name sku brand category sellingPrice costPrice images')
      .populate('category', 'name');
    const activeProductIds = activeProducts.map((p) => p._id);
    const activeProductMap = new Map();
    activeProducts.forEach((p) => activeProductMap.set(String(p._id), p));

    // 2. Orders in range
    const matchOrder = {
      isDeleted: false,
      createdAt: { $gte: startDate, $lte: endDate }
    };

    const ordersInRange = await Order.find(matchOrder)
      .select('orderNumber source total subtotal shippingFee tax discount orderStatus paymentStatus createdAt items')
      .sort({ createdAt: 1 });

    const validOrders = ordersInRange.filter((o) => o.orderStatus !== ORDER_STATUSES.CANCELLED);
    const cancelledOrders = ordersInRange.filter((o) => o.orderStatus === ORDER_STATUSES.CANCELLED);
    const returnedOrders = ordersInRange.filter((o) => o.orderStatus === ORDER_STATUSES.RETURNED || o.orderStatus === ORDER_STATUSES.RETURN_REQUESTED);

    const periodRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const periodOrdersCount = validOrders.length;
    const aov = periodOrdersCount > 0 ? Math.round(periodRevenue / periodOrdersCount) : 0;
    const returnRate = ordersInRange.length > 0 ? ((returnedOrders.length / ordersInRange.length) * 100).toFixed(1) : 0;
    const cancellationRate = ordersInRange.length > 0 ? ((cancelledOrders.length / ordersInRange.length) * 100).toFixed(1) : 0;

    // Expenses in range
    const expensesInRange = await Expense.find({
      isDeleted: false,
      date: { $gte: startDate, $lte: endDate }
    });
    const periodExpenses = expensesInRange.reduce((sum, e) => sum + (e.amount || 0), 0);

    // COGS
    let periodCOGS = 0;
    validOrders.forEach((o) => {
      o.items?.forEach((item) => {
        const prod = activeProductMap.get(String(item.productId));
        const cost = item.costPrice || prod?.costPrice || 0;
        periodCOGS += (cost * (item.quantity || 1));
      });
    });

    const netProfit = Math.max(0, periodRevenue - periodCOGS - periodExpenses);
    const profitMargin = periodRevenue > 0 ? ((netProfit / periodRevenue) * 100).toFixed(1) : 0;

    // 3. Daily Timeline Map
    const dailyMap = new Map();
    const cur = new Date(startDate);
    const endLimit = (range === 'last_month') ? endDate : now;

    while (cur <= endLimit) {
      const dateKey = cur.toISOString().split('T')[0];
      const label = cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap.set(dateKey, {
        date: label,
        fullDate: dateKey,
        revenue: 0,
        orders: 0,
        delivered: 0,
        profit: 0
      });
      cur.setDate(cur.getDate() + 1);
    }

    ordersInRange.forEach((o) => {
      const dateKey = new Date(o.createdAt).toISOString().split('T')[0];
      if (dailyMap.has(dateKey)) {
        const point = dailyMap.get(dateKey);
        if (o.orderStatus !== ORDER_STATUSES.CANCELLED) {
          point.revenue += (o.total || 0);
          point.orders += 1;
          if (o.orderStatus === ORDER_STATUSES.DELIVERED) {
            point.delivered += 1;
          }
          point.profit = Math.round(point.revenue * 0.35);
        }
      }
    });

    const dailyTimeline = Array.from(dailyMap.values());

    // 4. 12-Month Historical Trajectory
    const monthlyTrajectory = [];
    for (let i = 11; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const mLabel = mDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyTrajectory.push({
        month: mLabel,
        startDate: mDate,
        endDate: mEnd,
        revenue: 0,
        orders: 0,
        profit: 0
      });
    }

    const twelveMonthsStart = monthlyTrajectory[0].startDate;
    const all12MOrders = await Order.find({
      isDeleted: false,
      orderStatus: { $ne: ORDER_STATUSES.CANCELLED },
      createdAt: { $gte: twelveMonthsStart }
    }).select('total createdAt');

    all12MOrders.forEach((o) => {
      const oTime = new Date(o.createdAt).getTime();
      const mObj = monthlyTrajectory.find((m) => oTime >= m.startDate.getTime() && oTime <= m.endDate.getTime());
      if (mObj) {
        mObj.revenue += (o.total || 0);
        mObj.orders += 1;
        mObj.profit = Math.round(mObj.revenue * 0.35);
      }
    });

    const monthlyData = monthlyTrajectory.map((m) => ({
      month: m.month,
      revenue: m.revenue,
      orders: m.orders,
      profit: m.profit
    }));

    // 5. Channel Distribution in Period
    const channelMap = {
      Flipkart: { revenue: 0, orders: 0, color: '#2563eb' },
      Amazon: { revenue: 0, orders: 0, color: '#f59e0b' },
      Meesho: { revenue: 0, orders: 0, color: '#ec4899' },
      Website: { revenue: 0, orders: 0, color: '#10b981' },
      Manual: { revenue: 0, orders: 0, color: '#6366f1' }
    };

    validOrders.forEach((o) => {
      const src = o.source || 'Website';
      if (!channelMap[src]) {
        channelMap[src] = { revenue: 0, orders: 0, color: '#8b5cf6' };
      }
      channelMap[src].revenue += (o.total || 0);
      channelMap[src].orders += 1;
    });

    const channelShare = Object.entries(channelMap).map(([name, val]) => ({
      name,
      revenue: val.revenue,
      orders: val.orders,
      sharePercent: periodRevenue > 0 ? Math.round((val.revenue / periodRevenue) * 100) : 0,
      color: val.color
    }));

    // 6. Order Status Pipeline
    const statusCounts = {};
    Object.values(ORDER_STATUSES).forEach((st) => (statusCounts[st] = 0));
    ordersInRange.forEach((o) => {
      statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
    });

    const statusPipeline = [
      { status: 'Pending', count: statusCounts.PENDING || 0, fill: '#eab308' },
      { status: 'Confirmed', count: statusCounts.CONFIRMED || 0, fill: '#3b82f6' },
      { status: 'Processing', count: statusCounts.PROCESSING || 0, fill: '#6366f1' },
      { status: 'Shipped', count: statusCounts.SHIPPED || 0, fill: '#8b5cf6' },
      { status: 'Delivered', count: statusCounts.DELIVERED || 0, fill: '#10b981' },
      { status: 'Cancelled', count: statusCounts.CANCELLED || 0, fill: '#ef4444' },
      { status: 'Returned', count: (statusCounts.RETURNED || 0) + (statusCounts.RETURN_REQUESTED || 0), fill: '#64748b' }
    ];

    // 7. Stock Valuation & Category Breakdown - STRICTLY ACTIVE PRODUCTS
    const inventories = await Inventory.find({ productId: { $in: activeProductIds } })
      .populate('productId', 'name sku sellingPrice costPrice category isDeleted')
      .populate('warehouseId', 'name code');

    let totalPhysicalStock = 0;
    let totalAvailableStock = 0;
    let totalStockValuationCost = 0;
    let totalStockValuationRetail = 0;
    let healthyCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let damagedUnits = 0;

    const categoryStockMap = new Map();

    inventories.forEach((inv) => {
      const prod = inv.productId;
      if (!prod || prod.isDeleted) return;

      const physical = inv.physicalStock || 0;
      const available = inv.availableStock || 0;
      const cost = prod.costPrice || 0;
      const selling = prod.sellingPrice || 0;

      totalPhysicalStock += physical;
      totalAvailableStock += available;
      totalStockValuationCost += (physical * cost);
      totalStockValuationRetail += (available * selling);
      damagedUnits += (inv.damagedStock || 0);

      if (available === 0) {
        outOfStockCount++;
      } else if (available <= inv.minimumStock) {
        lowStockCount++;
      } else {
        healthyCount++;
      }

      const catName = prod.category?.name || 'General';
      if (!categoryStockMap.has(catName)) {
        categoryStockMap.set(catName, { name: catName, units: 0, valuation: 0 });
      }
      const catObj = categoryStockMap.get(catName);
      catObj.units += physical;
      catObj.valuation += (physical * cost);
    });

    const categoryBreakdown = Array.from(categoryStockMap.values()).sort((a, b) => b.valuation - a.valuation);

    const stockHealth = [
      { name: 'Optimal Stock', value: healthyCount, color: '#10b981' },
      { name: 'Low Stock Risk', value: lowStockCount, color: '#f59e0b' },
      { name: 'Out of Stock', value: outOfStockCount, color: '#ef4444' }
    ];

    // 8. Top Selling Active Products
    const productSalesMap = new Map();
    validOrders.forEach((o) => {
      o.items?.forEach((item) => {
        const prodId = String(item.productId);
        const prod = activeProductMap.get(prodId);
        if (prod && !prod.isDeleted) {
          if (!productSalesMap.has(prodId)) {
            productSalesMap.set(prodId, {
              id: prodId,
              name: prod.name,
              sku: prod.sku,
              image: prod.images?.[0]?.url || '',
              unitsSold: 0,
              revenue: 0,
              costPrice: prod.costPrice || 0
            });
          }
          const p = productSalesMap.get(prodId);
          p.unitsSold += (item.quantity || 1);
          p.revenue += (item.subtotal || 0);
        }
      });
    });

    const topSellingProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    if (topSellingProducts.length < 5) {
      activeProducts.forEach((prod) => {
        if (topSellingProducts.length >= 5) return;
        if (!productSalesMap.has(String(prod._id))) {
          topSellingProducts.push({
            id: prod._id,
            name: prod.name,
            sku: prod.sku,
            image: prod.images?.[0]?.url || '',
            unitsSold: 0,
            revenue: 0,
            costPrice: prod.costPrice || 0
          });
        }
      });
    }

    res.json({
      success: true,
      data: {
        range,
        kpis: {
          periodRevenue,
          periodOrdersCount,
          aov,
          periodCOGS,
          periodExpenses,
          netProfit,
          profitMargin: `${profitMargin}%`,
          returnRate: `${returnRate}%`,
          cancellationRate: `${cancellationRate}%`,
          totalPhysicalStock,
          totalAvailableStock,
          totalStockValuationCost,
          totalStockValuationRetail,
          damagedUnits
        },
        dailyTimeline,
        monthlyData,
        channelShare,
        statusPipeline,
        categoryBreakdown,
        stockHealth,
        topSellingProducts
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
      const activeProducts = await Product.find({ isDeleted: false }).select('_id');
      const activeProductIds = activeProducts.map((p) => p._id);
      const invs = await Inventory.find({ productId: { $in: activeProductIds } })
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
