const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Referrer is required"],
    },
    referred: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Referred user is required"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "expired"],
      default: "pending",
    },
    rewardAmount: {
      type: Number,
      default: 10, // Default reward in dollars
      min: [0, "Reward amount cannot be negative"],
    },
    rewardStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    completedAt: Date,
    rewardPaidAt: Date,
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
referralSchema.index({ referrer: 1, referred: 1 }, { unique: true });
referralSchema.index({ status: 1 });
referralSchema.index({ rewardStatus: 1 });

// Method to mark referral as completed
referralSchema.methods.markAsCompleted = async function () {
  this.status = "completed";
  this.completedAt = new Date();
  await this.save();
};

// Method to process reward
referralSchema.methods.processReward = async function () {
  const Transaction = mongoose.model("Transaction");

  // Create credit transaction for referrer
  const transaction = new Transaction({
    user: this.referrer,
    type: "credit",
    amount: this.rewardAmount,
    reason: `Referral reward for user ${this.referred}`,
    status: "completed",
    metadata: {
      referralId: this._id,
      referredUserId: this.referred,
    },
  });

  await transaction.save();
  await transaction.updateWalletBalance();

  this.rewardStatus = "paid";
  this.rewardPaidAt = new Date();
  await this.save();
};

const Referral = mongoose.model("Referral", referralSchema);

module.exports = Referral;
