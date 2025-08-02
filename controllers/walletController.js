const User = require("../models/userModel");
const Transaction = require("../models/transactionModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlersFactory");

// @desc    Add funds to user wallet (Admin only)
// @route   POST /api/v1/wallet/add-funds/:userId
// @access  Private/Admin
exports.addFunds = catchAsync(async (req, res, next) => {
  const { amount, description } = req.body;

  // 1) Get user and update balance
  const user = await User.findById(req.params.userId);
  if (!user) {
    return next(new AppError("لم يتم العثور على المستخدم", 404));
  }

  // 2) Update user's wallet balance
  user.wallet += amount;
  await user.save({ validateBeforeSave: false });

  // === منطق عمولة الإحالة ===
  if (user.referredBy && !user.referralRewarded) {
    // جلب نسبة العمولة من الإعدادات (افتراضي 10%)
    const Settings = require("../models/settingsModel");
    let referralPercent = 10;
    const settings = await Settings.findOne();
    if (settings && settings.referralPercent) {
      referralPercent = settings.referralPercent;
    }
    // حساب العمولة
    const reward = (amount * referralPercent) / 100;
    // إضافة العمولة لصاحب الكود
    const referrer = await User.findById(user.referredBy);
    if (referrer) {
      referrer.referralEarnings += reward;
      await referrer.save({ validateBeforeSave: false });
    }
    // تحديث حالة احتساب العمولة
    user.referralRewarded = true;
    await user.save({ validateBeforeSave: false });
  }

  // 3) Create transaction record
  await Transaction.create({
    user: user._id,
    amount,
    type: "deposit",
    status: "completed",
    description: description || "إضافة رصيد من قبل المدير",
    metadata: {
      addedBy: req.user.id,
      previousBalance: user.wallet - amount,
      newBalance: user.wallet,
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        wallet: user.wallet,
      },
      amount,
      description: description || "تمت إضافة الرصيد بنجاح",
    },
  });
});

// @desc    Deduct funds from user wallet
// @route   POST /api/v1/wallet/deduct-funds
// @access  Private
exports.deductFunds = catchAsync(async (req, res, next) => {
  const { amount, description, service } = req.body;

  // 1) Check if user has sufficient balance
  if (req.user.wallet < amount) {
    return next(new AppError("الرصيد غير كافٍ لإتمام العملية", 400));
  }

  // 2) Update user's wallet balance
  const previousBalance = req.user.wallet;
  req.user.wallet -= amount;
  await req.user.save({ validateBeforeSave: false });

  // 3) Create transaction record
  await Transaction.create({
    user: req.user._id,
    amount: -amount,
    type: service ? "purchase" : "withdrawal",
    status: "completed",
    description: description || "خصم من الرصيد",
    metadata: {
      service,
      previousBalance,
      newBalance: req.user.wallet,
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      amount,
      remainingBalance: req.user.wallet,
      description: description || "تمت عملية الخصم بنجاح",
    },
  });
});

// @desc    Get user wallet transactions
// @route   GET /api/v1/wallet/transactions
// @access  Private
exports.getTransactions = catchAsync(async (req, res, next) => {
  // 1) Filtering
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete queryObj[el]);

  // 2) Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  let query = Transaction.find({ user: req.user.id, ...JSON.parse(queryStr) });

  // 3) Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // 4) Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  const total = await Transaction.countDocuments({
    user: req.user.id,
    ...JSON.parse(queryStr),
  });

  query = query.skip(skip).limit(limit);

  const transactions = await query;

  res.status(200).json({
    status: "success",
    results: transactions.length,
    total,
    data: {
      transactions,
    },
  });
});

// @desc    Get wallet balance
// @route   GET /api/v1/wallet/balance
// @access  Private
exports.getWalletBalance = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("wallet");

  res.status(200).json({
    status: "success",
    data: {
      balance: user.wallet,
      currency: "USD", // يمكن تغيير العملة حسب الحاجة
    },
  });
});
