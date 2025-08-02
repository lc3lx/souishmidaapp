const Post = require("../models/postModel");
const SocialAccount = require("../models/socialAccountModel");
const Queue = require("bull");
const SocialMediaService = require("../services/socialMediaService");

// Create post queue
const postQueue = new Queue("post-queue", {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// Create new post
exports.createPost = async (req, res) => {
  try {
    const {
      content,
      mediaUrl,
      mediaType,
      socialAccounts,
      perPlatformConfig,
      scheduledAt,
    } = req.body;

    // Validate social accounts
    const accounts = await SocialAccount.find({
      _id: { $in: socialAccounts },
      user: req.user.id,
      isActive: true,
    });

    if (accounts.length !== socialAccounts.length) {
      return res.status(400).json({
        status: "error",
        message: "One or more social accounts are invalid or inactive",
      });
    }

    // Prepare platforms array for SocialMediaService
    const platforms = accounts.flatMap(account =>
      account.pages.map(page => ({
        name: account.platform,
        pageId: page.id,
        pageName: page.name,
        status: 'pending'
      }))
    );

    // Create post
    const post = await Post.create({
      user: req.user.id,
      content,
      mediaUrl,
      mediaType,
      socialAccounts: socialAccounts, // Keep original IDs for reference
      platforms: platforms, // The new array expected by the service
      perPlatformConfig,
      scheduledAt: scheduledAt || new Date(),
      status: scheduledAt ? "scheduled" : "draft",
    });

    // Add to queue if scheduled
    if (scheduledAt) {
      await postQueue.add(
        { postId: post._id },
        { delay: new Date(scheduledAt).getTime() - Date.now() }
      );
    }

    res.status(201).json({
      status: "success",
      data: {
        post,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get all posts
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user.id })
      .populate("socialAccounts")
      .sort("-createdAt");

    res.status(200).json({
      status: "success",
      data: {
        posts,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get single post
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("socialAccounts");

    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        post,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Update post
exports.updatePost = async (req, res) => {
  try {
    const { content, mediaUrl, mediaType, perPlatformConfig, scheduledAt } =
      req.body;

    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    // Can't update published posts
    if (post.status === "published") {
      return res.status(400).json({
        status: "error",
        message: "Cannot update published posts",
      });
    }

    // Update post
    post.content = content || post.content;
    post.mediaUrl = mediaUrl || post.mediaUrl;
    post.mediaType = mediaType || post.mediaType;
    post.perPlatformConfig = perPlatformConfig || post.perPlatformConfig;
    post.scheduledAt = scheduledAt || post.scheduledAt;
    post.status = scheduledAt ? "scheduled" : "draft";

    await post.save();

    // Update queue if scheduled
    if (scheduledAt) {
      await postQueue.add(
        { postId: post._id },
        { delay: new Date(scheduledAt).getTime() - Date.now() }
      );
    }

    res.status(200).json({
      status: "success",
      data: {
        post,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Publish post immediately
exports.publishPost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    if (post.status === "published") {
      return res.status(400).json({
        status: "error",
        message: "Post is already published",
      });
    }

    // Add to queue for immediate publishing
    await postQueue.add({ postId: post._id });

    res.status(200).json({
      status: "success",
      message: "Post queued for publishing",
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Queue Processor
postQueue.process(async (job) => {
  const { postId } = job.data;
  console.log(`Processing post ${postId}`);

  const post = await Post.findById(postId).populate('user');

  if (!post) {
    console.error(`Post with ID ${postId} not found.`);
    return;
  }

  if (!post.user) {
    console.error(`User for post ${postId} not found.`);
    return;
  }

  try {
    const socialMediaService = new SocialMediaService(post.user);
    await socialMediaService.publishPost(post);

    post.status = 'published';
    post.publishedAt = new Date();
    await post.save();
    console.log(`Post ${postId} published successfully.`);

  } catch (error) {
    console.error(`Failed to publish post ${postId}:`, error);
    post.status = 'failed';
    post.error = error.message;
    await post.save();
  }
});
