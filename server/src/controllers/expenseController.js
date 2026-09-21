import { Expense } from '../models/Expense.js';
import { EXPENSE_CATEGORIES } from '../config/constants.js';
import { logAudit } from '../middlewares/auditMiddleware.js';

export const getExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 25 } = req.query;
    const query = { isDeleted: false };

    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [expenses, total] = await Promise.all([
      Expense.find(query).populate('createdBy', 'name').sort({ date: -1 }).skip(skip).limit(parseInt(limit, 10)),
      Expense.countDocuments(query)
    ]);

    // Category breakdown
    const breakdown = await Expense.aggregate([
      { $match: query },
      { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalExpense = breakdown.reduce((sum, b) => sum + b.totalAmount, 0);

    res.json({
      success: true,
      data: {
        expenses,
        breakdown,
        totalExpense,
        categories: EXPENSE_CATEGORIES,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const { title, category, amount, date, paymentMethod, referenceNumber, notes } = req.body;

    const expense = await Expense.create({
      title,
      category,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      paymentMethod,
      referenceNumber,
      notes,
      createdBy: req.user?._id
    });

    await logAudit({
      req,
      action: 'EXPENSE_RECORDED',
      module: 'Finance',
      entityId: expense._id,
      newValue: { title, category, amount },
      reason: `Expense recorded: ₹${amount}`
    });

    res.status(201).json({ success: true, message: 'Expense recorded successfully', data: { expense } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    expense.isDeleted = true;
    await expense.save();

    await logAudit({
      req,
      action: 'EXPENSE_DELETED',
      module: 'Finance',
      entityId: id,
      reason: 'Expense deleted'
    });

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
