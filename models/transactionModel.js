const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Transaction must belong to a user"],
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: [true, "Transaction type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Transaction amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    reason: {
      type: String,
      required: [true, "Transaction reason is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    reference: {
      type: String,
      unique: true,
    },
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
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ reference: 1 });

// Generate reference before saving
transactionSchema.pre("save", async function (next) {
  if (!this.reference) {
    this.reference = `TRX-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
  next();
});

// Method to update user's wallet balance
transactionSchema.methods.updateWalletBalance = async function () {
  const User = mongoose.model("User");
  const user = await User.findById(this.user);

  if (!user) {
    throw new Error("User not found");
  }

  if (this.type === "credit") {
    user.walletBalance += this.amount;
  } else {
    if (user.walletBalance < this.amount) {
      throw new Error("Insufficient balance");
    }
    user.walletBalance -= this.amount;
  }

  await user.save();
};

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
