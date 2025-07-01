const Razorpay = require("razorpay");
const TransactionHistory = require("../models/TransactionHistory");
const expressAsyncHandler = require("express-async-handler");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAYKEY,
  key_secret: process.env.RAZORPAYKEYSECRET,
});

exports.paymentController = async (req, res) => {
  const { amount, currency } = req.body;

  try {
    const order = await razorpayInstance.orders.create({
      amount: amount * 100, // Amount in paise
      currency: currency,
    });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.myTransactionHistory = async (req, res) => {
  try {
    const {
      filterData: {
        type = 'all', // credit, debit, or all
        search = '',
        page = 1,
        limit = 10
      } = {},
    } = req.body;

    const userId = req.userId;
    const skip = (Number(page) - 1) * Number(limit);

    const baseQuery = { userId };

    // Filter by type
    const query = { ...baseQuery };
    if (type !== 'all') {
      query.type = type;
    }

    // Search logic (booking ID or method)
    if (search) {
      query.$or = [
        { method: { $regex: search, $options: 'i' } },
        { bookingId: { $regex: search, $options: 'i' } }
      ];
    }

    const isFiltered = type !== 'all' || Boolean(search);

    const total = isFiltered
      ? await TransactionHistory.countDocuments(query)
      : await TransactionHistory.countDocuments(baseQuery);

    const transactions = await TransactionHistory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Get counts for filter tabs
    const [all, credit, debit] = await Promise.all([
      TransactionHistory.countDocuments(baseQuery),
      TransactionHistory.countDocuments({ ...baseQuery, type: 'credit' }),
      TransactionHistory.countDocuments({ ...baseQuery, type: 'debit' })
    ]);
const ObjectId = require('mongoose').Types.ObjectId;
  const totalAmountResult = await TransactionHistory.aggregate([
  { 
    $match: { 
      userId: new ObjectId(userId) // Convert string to ObjectId
    } 
  },
  {
    $group: {
      _id: null,
      totalAmount: { $sum: "$amount" }
    }
  }
]);

    res.status(200).json({
      success: true,
      message: 'Transaction history retrieved!',
      total,
      page: Number(page),
      limit: Number(limit),
      totalAmountResult: totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0,
      data: transactions,
      typeCounts: {
        all,
        credit,
        debit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction history',
      error: error.message
    });
  }
};

