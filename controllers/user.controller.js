const User = require("../models/userModel");
const Transaction = require("../models/transactionModel");

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { email } = req.body;

    // Prevent password update through this route
    if (req.body.password) {
      return res.status(400).json({
        status: "error",
        message:
          "This route is not for password updates. Please use /update-password",
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { email },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get user wallet
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const transactions = await Transaction.find({ user: req.user.id })
      .sort("-createdAt")
      .limit(10);

    res.status(200).json({
      status: "success",
      data: {
        balance: user.walletBalance,
        transactions,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Add funds to wallet
exports.addFunds = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid amount",
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user.id,
      type: "credit",
      amount,
      reason: "Manual wallet top-up",
      status: "completed",
    });

    // Update wallet balance
    await transaction.updateWalletBalance();

    res.status(200).json({
      status: "success",
      data: {
        transaction,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get referral stats
exports.getReferralStats = async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.user.id })
      .populate("referred", "email createdAt")
      .sort("-createdAt");

    const stats = {
      totalReferrals: referrals.length,
      completedReferrals: referrals.filter((ref) => ref.status === "completed")
        .length,
      pendingRewards: referrals.filter((ref) => ref.rewardStatus === "pending")
        .length,
      totalEarnings: referrals.reduce((sum, ref) => sum + ref.rewardAmount, 0),
      referrals,
    };

    res.status(200).json({
      status: "success",
      data: {
        stats,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};
