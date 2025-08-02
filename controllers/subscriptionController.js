const Subscription = require("../models/subscriptionModel");
const Package = require("../models/packageModel");
const User = require("../models/userModel");
const Transaction = require("../models/transactionModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// @desc    Subscribe user to a package (deduct wallet, create subscription, log transaction)
// @route   POST /api/v1/subscriptions/subscribe
// @access  Private/User
exports.subscribeToPackage = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { packageId } = req.body;

  const user = await User.findById(userId);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  const pkg = await Package.findById(packageId);
  if (!pkg || !pkg.isActive) return next(new AppError("الباقة غير متاحة", 400));

  // Check if user already has active subscription
  const activeSub = await Subscription.findOne({ user: userId, isActive: true });
  if (activeSub) return next(new AppError("لديك اشتراك نشط بالفعل", 400));

  // Check wallet balance
  if (user.wallet < pkg.price) return next(new AppError("الرصيد غير كافٍ", 400));

  // Deduct wallet
  user.wallet -= pkg.price;
  await user.save({ validateBeforeSave: false });

  // Create transaction
  await Transaction.create({
    user: userId,
    type: "debit",
    amount: pkg.price,
    reason: `اشتراك في باقة: ${pkg.name}`,
    status: "completed",
    reference: `SUB-${userId}-${Date.now()}`,
    metadata: { package: pkg._id, packageName: pkg.name },
  });

  // Create subscription (default: monthly)
  const now = new Date();
  let endDate = new Date(now);
  if (pkg.duration === "monthly") endDate.setMonth(now.getMonth() + 1);
  else if (pkg.duration === "yearly") endDate.setFullYear(now.getFullYear() + 1);

  const subscription = await Subscription.create({
    user: userId,
    package: pkg._id,
    startDate: now,
    endDate,
    isActive: true,
  });

  res.status(201).json({ status: "success", data: { subscription } });
});

// @desc    Get my active subscription
// @route   GET /api/v1/subscriptions/my
// @access  Private/User
exports.getMySubscription = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const subscription = await Subscription.findOne({ user: userId, isActive: true }).populate("package");
  res.status(200).json({ status: "success", data: { subscription } });
});

// @desc    Admin: get all subscriptions
// @route   GET /api/v1/subscriptions
// @access  Private/Admin
exports.getAllSubscriptions = catchAsync(async (req, res, next) => {
  const subscriptions = await Subscription.find().populate("user package");
  res.status(200).json({ status: "success", results: subscriptions.length, data: { subscriptions } });
});
