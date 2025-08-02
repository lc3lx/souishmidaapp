const User = require("../models/userModel");
const Service = require("../models/serviceModel");
const Subscription = require("../models/subscriptionModel");
const Offer = require("../models/offerModel");
const Transaction = require("../models/transactionModel");
const Settings = require("../models/settingsModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const GiftTransaction = require("../models/giftTransactionModel");
const Notification = require("../models/notificationModel");

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select("-password -__v");

  res.status(200).json({
    status: "success",
    results: users.length,
    data: {
      users,
    },
  });
});

// @desc    Manage user subscription
// @route   PATCH /api/v1/admin/users/:userId/subscription
// @access  Private/Admin
exports.manageUserSubscription = catchAsync(async (req, res, next) => {
  const { serviceId, plan, startDate, endDate, status } = req.body;

  // Find or create subscription
  let subscription = await Subscription.findOneAndUpdate(
    { user: req.params.userId, service: serviceId },
    { plan, startDate, endDate, status, isActive: status === "active" },
    { new: true, upsert: true, runValidators: true }
  ).populate("service", "name description");

  res.status(200).json({
    status: "success",
    data: {
      subscription,
    },
  });
});

// @desc    Create or update offer
// @route   POST /api/v1/admin/offers
// @access  Private/Admin
exports.manageOffer = catchAsync(async (req, res, next) => {
  let offer;

  if (req.body.id) {
    // Update existing offer
    offer = await Offer.findByIdAndUpdate(req.body.id, req.body, {
      new: true,
      runValidators: true,
    });
  } else {
    // Create new offer
    offer = await Offer.create(req.body);
  }

  res.status(200).json({
    status: "success",
    data: {
      offer,
    },
  });
});

// @desc    Toggle service status
// @route   PATCH /api/v1/admin/services/:id/toggle-status
// @access  Private/Admin
exports.toggleServiceStatus = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError("الخدمة غير موجودة", 404));
  }

  service.isActive = !service.isActive;
  await service.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    data: {
      service,
    },
  });
});

// @desc    Get system statistics
// @route   GET /api/v1/admin/statistics
// @access  Private/Admin
exports.getStatistics = catchAsync(async (req, res, next) => {
  const stats = {
    totalUsers: await User.countDocuments(),
    activeSubscriptions: await Subscription.countDocuments({ isActive: true }),
    totalRevenue:
      (
        await Transaction.aggregate([
          { $match: { type: "purchase" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
      )[0]?.total || 0,
    activeOffers: await Offer.countDocuments({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }),
  };

  res.status(200).json({
    status: "success",
    data: {
      statistics: stats,
    },
  });
});

// @desc    Get user details
// @route   GET /api/v1/admin/users/:id
// @access  Private/Admin
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select("-password -__v")
    .populate("subscriptions")
    .populate("transactions");

  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// @desc    Update user
// @route   PATCH /api/v1/admin/users/:id
// @access  Private/Admin
exports.updateUser = catchAsync(async (req, res, next) => {
  // 1) Filter out unwanted fields
  const filteredBody = { ...req.body };
  const excludedFields = ["password", "passwordConfirm"];
  excludedFields.forEach((el) => delete filteredBody[el]);

  // 2) Update user
  const user = await User.findByIdAndUpdate(req.params.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  // TODO: Clean up user's data (posts, messages, etc.)

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// @desc    Update referral percent setting
// @route   PATCH /api/v1/admin/settings/referral-percent
// @access  Private/Admin
exports.updateReferralPercent = catchAsync(async (req, res, next) => {
  const { referralPercent } = req.body;
  if (
    typeof referralPercent !== "number" ||
    referralPercent < 0 ||
    referralPercent > 100
  ) {
    return next(new AppError("النسبة يجب أن تكون رقم بين 0 و 100", 400));
  }
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ referralPercent });
  } else {
    settings.referralPercent = referralPercent;
    await settings.save();
  }
  res.status(200).json({
    status: "success",
    data: { referralPercent: settings.referralPercent },
  });
});

// @desc    Gift a subscription to another user
// @route   POST /api/v1/gift/subscription
// @access  Private
exports.giftSubscription = catchAsync(async (req, res, next) => {
  const { recipientId, subscriptionId } = req.body;
  const senderId = req.user._id;

  // 1. تحقق من وجود المرسل والمستلم والاشتراك
  const sender = await User.findById(senderId);
  const recipient = await User.findById(recipientId);
  const subscription = await Subscription.findById(subscriptionId);
  if (!sender || !recipient || !subscription) {
    return next(
      new AppError("بيانات غير صحيحة (مستخدم أو اشتراك غير موجود)", 400)
    );
  }

  // 2. تحقق من رصيد المرسل
  if (sender.wallet < subscription.price) {
    return next(new AppError("رصيدك غير كافٍ لإهداء هذا الاشتراك", 400));
  }

  // 3. خصم الرصيد من المرسل
  sender.wallet -= subscription.price;
  await sender.save({ validateBeforeSave: false });

  // 4. إضافة الاشتراك للمستلم (أو تحديث اشتراكه)
  let giftedSub = await Subscription.findOneAndUpdate(
    { user: recipientId, service: subscription.service },
    {
      plan: subscription.plan,
      startDate: new Date(),
      endDate: subscription.endDate, // أو احسبها حسب مدة الباقة
      status: "active",
      isActive: true,
    },
    { new: true, upsert: true, runValidators: true }
  );

  // 5. تسجيل عملية الإهداء
  await GiftTransaction.create({
    sender: senderId,
    recipient: recipientId,
    subscription: giftedSub._id,
    amount: subscription.price,
    status: "completed",
  });

  // 6. إرسال إشعار للمستلم
  await Notification.create({
    user: recipientId,
    title: "تم استلام إهداء!",
    body: `لقد استلمت اشتراك (${subscription.plan}) كهدية من ${sender.name}`,
  });

  res.status(200).json({
    status: "success",
    message: "تم إرسال الإهداء بنجاح",
    data: { giftedSub },
  });
});
