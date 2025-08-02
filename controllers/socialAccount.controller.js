const SocialAccount = require("../models/socialAccountModel");
const User = require("../models/userModel");

// Get all social accounts for user
exports.getSocialAccounts = async (req, res) => {
  try {
    const accounts = await SocialAccount.find({ user: req.user.id });
    res.status(200).json({
      status: "success",
      data: {
        accounts,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Connect new social account
exports.connectAccount = async (req, res) => {
  try {
    const {
      platform,
      accessToken,
      refreshToken,
      pageId,
      accountId,
      platformUsername,
    } = req.body;

    // Check if account already exists
    const existingAccount = await SocialAccount.findOne({
      user: req.user.id,
      platform,
    });

    if (existingAccount) {
      return res.status(400).json({
        status: "error",
        message: "Account already connected for this platform",
      });
    }

    // Create new social account
    const account = await SocialAccount.create({
      user: req.user.id,
      platform,
      accessToken,
      refreshToken,
      pageId,
      accountId,
      platformUsername,
      lastTokenRefresh: new Date(),
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    });

    res.status(201).json({
      status: "success",
      data: {
        account,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Update social account
exports.updateAccount = async (req, res) => {
  try {
    const { accessToken, refreshToken } = req.body;
    const account = await SocialAccount.findOneAndUpdate(
      { user: req.user.id, _id: req.params.id },
      {
        accessToken,
        refreshToken,
        lastTokenRefresh: new Date(),
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!account) {
      return res.status(404).json({
        status: "error",
        message: "Account not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        account,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Disconnect social account
exports.disconnectAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findOneAndUpdate(
      { user: req.user.id, _id: req.params.id },
      { isActive: false },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!account) {
      return res.status(404).json({
        status: "error",
        message: "Account not found",
      });
    }

    res.status(200).json({
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

// Get account analytics
exports.getAccountAnalytics = async (req, res) => {
  try {
    const account = await SocialAccount.findOne({
      user: req.user.id,
      _id: req.params.id,
    });

    if (!account) {
      return res.status(404).json({
        status: "error",
        message: "Account not found",
      });
    }

    // Placeholder for actual analytics data
    const analytics = {
      followers: 0,
      engagement: 0,
      reach: 0,
      // Add more analytics as needed
    };

    res.status(200).json({
      status: "success",
      data: {
        analytics,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};
