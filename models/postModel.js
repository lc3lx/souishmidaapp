const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Post must belong to a user"],
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
    },
    mediaUrl: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || v.startsWith("http");
        },
        message: "Media URL must be a valid URL",
      },
    },
    mediaType: {
      type: String,
      enum: ["image", "video", null],
    },
    socialAccounts: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "SocialAccount",
        required: [
          true,
          "Post must be associated with at least one social account",
        ],
      },
    ],
    perPlatformConfig: {
      type: Map,
      of: {
        content: String,
        mediaUrl: String,
        scheduledAt: Date,
      },
    },
    scheduledAt: {
      type: Date,
      required: [true, "Scheduled time is required"],
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "failed"],
      default: "draft",
    },
    publishedAt: Date,
    platformPostIds: {
      type: Map,
      of: String,
    },
    analytics: {
      type: Map,
      of: {
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        reach: { type: Number, default: 0 },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
postSchema.index({ user: 1, scheduledAt: 1 });
postSchema.index({ status: 1, scheduledAt: 1 });

// Virtual populate for comments
postSchema.virtual("comments", {
  ref: "Comment",
  foreignField: "post",
  localField: "_id",
});

// Method to check if post is ready to be published
postSchema.methods.isReadyToPublish = function () {
  return this.status === "scheduled" && this.scheduledAt <= new Date();
};

// Method to mark post as published
postSchema.methods.markAsPublished = function (platformPostIds) {
  this.status = "published";
  this.publishedAt = new Date();
  this.platformPostIds = platformPostIds;
};

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
