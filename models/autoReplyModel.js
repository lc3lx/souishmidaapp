const mongoose = require("mongoose");

const autoReplySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Auto reply must belong to a user"],
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: [true, "Auto reply must be associated with a product"],
    },
    keywords: [
      {
        type: String,
        required: [true, "At least one keyword is required"],
        trim: true,
      },
    ],
    responseTemplate: {
      type: String,
      required: [true, "Response template is required"],
      trim: true,
    },
    platforms: [
      {
        type: String,
        enum: ["facebook", "instagram", "tiktok", "twitter"],
        required: [true, "At least one platform must be specified"],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    replyType: {
      type: String,
      enum: ["comment", "message"],
      default: "comment",
    },
    costPerReply: {
      type: Number,
      default: 0.1, // Default cost in dollars
      min: [0, "Cost cannot be negative"],
    },
    stats: {
      totalReplies: { type: Number, default: 0 },
      lastReplyAt: Date,
      totalCost: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
autoReplySchema.index({ user: 1, isActive: 1 });
autoReplySchema.index({ keywords: 1 });

// Method to check if a comment matches any keywords
autoReplySchema.methods.matchesKeywords = function (comment) {
  const commentLower = comment.toLowerCase();
  return this.keywords.some((keyword) =>
    commentLower.includes(keyword.toLowerCase())
  );
};

// Method to generate response with product details
autoReplySchema.methods.generateResponse = function () {
  return this.responseTemplate.replace("{{product}}", this.product.title);
};

// Method to update stats after reply
autoReplySchema.methods.updateStats = function () {
  this.stats.totalReplies += 1;
  this.stats.lastReplyAt = new Date();
  this.stats.totalCost += this.costPerReply;
};

const AutoReply = mongoose.model("AutoReply", autoReplySchema);

module.exports = AutoReply;
