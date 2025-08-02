const mongoose = require("mongoose");

const socialAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Social account must belong to a user"],
    },
    platform: {
      type: String,
      required: [true, "Platform is required"],
      enum: ["facebook", "instagram", "tiktok", "threads"],
    },
    accessToken: {
      type: String,
      required: [true, "Access token is required"],
    },
    refreshToken: {
      type: String,
      required: [true, "Refresh token is required"],
    },
    pageId: {
      type: String,
      required: [true, "Page ID is required"],
    },
    accountId: {
      type: String,
      required: [true, "Account ID is required"],
    },
    platformUsername: {
      type: String,
      required: [true, "Platform username is required"],
    },
    platformProfileUrl: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTokenRefresh: Date,
    tokenExpiresAt: Date,
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
socialAccountSchema.index({ user: 1, platform: 1 }, { unique: true });

// Virtual populate for posts
socialAccountSchema.virtual("posts", {
  ref: "Post",
  foreignField: "socialAccounts",
  localField: "_id",
});

const SocialAccount = mongoose.model("SocialAccount", socialAccountSchema);

module.exports = SocialAccount;
