const Transaction = require("../models/transactionModel");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// @desc    Create a new transaction (admin/manual)
// @route   POST /api/v1/transactions
// @access  Private/Admin
exports.createTransaction = catchAsync(async (req, res, next) => {
  const { user, type, amount, reason, reference, metadata } = req.body;
  const foundUser = await User.findById(user);
  if (!foundUser) return next(new AppError("المستخدم غير موجود", 404));
  if (amount < 0) return next(new AppError("المبلغ لا يمكن أن يكون سالبًا", 400));

  // Create transaction
  const transaction = await Transaction.create({
    user,
    type,
    amount,
    reason,
    reference,
    metadata,
    status: "completed",
  });

  // Update user wallet
  if (type === "credit") foundUser.wallet += amount;
  else if (type === "debit") {
    if (foundUser.wallet < amount) return next(new AppError("الرصيد غير كافٍ", 400));
    foundUser.wallet -= amount;
  }
  await foundUser.save({ validateBeforeSave: false });

  res.status(201).json({ status: "success", data: { transaction } });
});

// @desc    Get all transactions
// @route   GET /api/v1/transactions
// @access  Private/Admin
exports.getAllTransactions = catchAsync(async (req, res, next) => {
  const transactions = await Transaction.find().populate("user").sort("-createdAt");
  res.status(200).json({ status: "success", results: transactions.length, data: { transactions } });
});

// @desc    Get single transaction
// @route   GET /api/v1/transactions/:id
// @access  Private/Admin
exports.getTransaction = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.id).populate("user");
  if (!transaction) return next(new AppError("الحركة غير موجودة", 404));
  res.status(200).json({ status: "success", data: { transaction } });
});
