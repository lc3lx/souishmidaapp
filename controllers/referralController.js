const Referral = require("../models/referralModel");
const User = require("../models/userModel");
const AppError = require("../utils/appError");

// Create referral (user refers another user)
exports.createReferral = async (req, res, next) => {
  try {
    const { referredId } = req.body;
    if (!referredId) return next(new AppError("يرجى تحديد المستخدم المُحال", 400));
    if (referredId === req.user.id) return next(new AppError("لا يمكنك إحالة نفسك!", 400));

    // Check if referral already exists
    const exists = await Referral.findOne({ referrer: req.user.id, referred: referredId });
    if (exists) return next(new AppError("الإحالة موجودة مسبقاً", 400));

    const referral = await Referral.create({
      referrer: req.user.id,
      referred: referredId,
    });
    res.status(201).json({ status: "success", data: { referral } });
  } catch (err) {
    next(err);
  }
};

// Get all referrals for a user
exports.getMyReferrals = async (req, res, next) => {
  try {
    const referrals = await Referral.find({ referrer: req.user.id }).populate("referred");
    res.status(200).json({ status: "success", data: { referrals } });
  } catch (err) {
    next(err);
  }
};

// Admin: get all referrals
exports.adminGetAllReferrals = async (req, res, next) => {
  try {
    const referrals = await Referral.find().populate("referrer referred");
    res.status(200).json({ status: "success", data: { referrals } });
  } catch (err) {
    next(err);
  }
};

// Admin: update referral reward amount
exports.adminUpdateReferralReward = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rewardAmount } = req.body;
    const referral = await Referral.findByIdAndUpdate(
      id,
      { rewardAmount },
      { new: true, runValidators: true }
    );
    if (!referral) return next(new AppError("الإحالة غير موجودة", 404));
    res.status(200).json({ status: "success", data: { referral } });
  } catch (err) {
    next(err);
  }
};

// Admin: update referral status
exports.adminUpdateReferralStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const referral = await Referral.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!referral) return next(new AppError("الإحالة غير موجودة", 404));
    res.status(200).json({ status: "success", data: { referral } });
  } catch (err) {
    next(err);
  }
};
