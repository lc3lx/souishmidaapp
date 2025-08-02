const AutoReply = require("../models/autoReplyModel");
const Product = require("../models/productModel");
const Transaction = require("../models/transactionModel");

// Create new auto reply
exports.createAutoReply = async (req, res) => {
  try {
    const { productId, keywords, responseTemplate, platforms, replyType } =
      req.body;

    // Check if product exists and belongs to user
    const product = await Product.findOne({
      _id: productId,
      user: req.user.id,
    });

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      });
    }

    const autoReply = await AutoReply.create({
      user: req.user.id,
      product: productId,
      keywords,
      responseTemplate,
      platforms,
      replyType,
    });

    res.status(201).json({
      status: "success",
      data: {
        autoReply,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get all auto replies
exports.getAutoReplies = async (req, res) => {
  try {
    const autoReplies = await AutoReply.find({ user: req.user.id })
      .populate("product")
      .sort("-createdAt");

    res.status(200).json({
      status: "success",
      data: {
        autoReplies,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get single auto reply
exports.getAutoReply = async (req, res) => {
  try {
    const autoReply = await AutoReply.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("product");

    if (!autoReply) {
      return res.status(404).json({
        status: "error",
        message: "Auto reply not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        autoReply,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Update auto reply
exports.updateAutoReply = async (req, res) => {
  try {
    const { keywords, responseTemplate, platforms, replyType } = req.body;

    const autoReply = await AutoReply.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        keywords,
        responseTemplate,
        platforms,
        replyType,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!autoReply) {
      return res.status(404).json({
        status: "error",
        message: "Auto reply not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        autoReply,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Delete auto reply
exports.deleteAutoReply = async (req, res) => {
  try {
    const autoReply = await AutoReply.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!autoReply) {
      return res.status(404).json({
        status: "error",
        message: "Auto reply not found",
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

// Toggle auto reply status
exports.toggleAutoReplyStatus = async (req, res) => {
  try {
    const autoReply = await AutoReply.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!autoReply) {
      return res.status(404).json({
        status: "error",
        message: "Auto reply not found",
      });
    }

    autoReply.isActive = !autoReply.isActive;
    await autoReply.save();

    res.status(200).json({
      status: "success",
      data: {
        autoReply,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Process incoming comment
exports.processComment = async (req, res) => {
  try {
    const { platform, comment, postId, commentId } = req.body;

    // Find matching auto replies
    const autoReplies = await AutoReply.find({
      user: req.user.id,
      platforms: platform,
      isActive: true,
    }).populate("product");

    // Check for matching keywords
    const matchingReply = autoReplies.find((reply) =>
      reply.matchesKeywords(comment)
    );

    if (!matchingReply) {
      return res.status(200).json({
        status: "success",
        message: "No matching auto reply found",
      });
    }

    // Generate response
    const response = matchingReply.generateResponse();

    // Create transaction for reply cost
    const transaction = await Transaction.create({
      user: req.user.id,
      type: "debit",
      amount: matchingReply.costPerReply,
      reason: `Auto reply to comment on ${platform}`,
      status: "completed",
      metadata: {
        platform,
        postId,
        commentId,
        autoReplyId: matchingReply._id,
      },
    });

    // Update wallet balance
    await transaction.updateWalletBalance();

    // Update auto reply stats
    await matchingReply.updateStats();

    res.status(200).json({
      status: "success",
      data: {
        response,
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
