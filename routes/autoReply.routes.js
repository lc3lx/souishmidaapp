const express = require("express");
const { protect } = require("../controllers/auth.Controller");
const {
  createAutoReply,
  getAutoReplies,
  getAutoReply,
  updateAutoReply,
  deleteAutoReply,
  toggleAutoReplyStatus,
  processComment,
} = require("../controllers/autoReply.controller");

const { requireActiveSubscription, requirePackageService } = require("../middleware/subscriptionMiddleware");
const router = express.Router();

// Protect all routes
router.use(protect);

// Get all auto replies
router.get("/", getAutoReplies);

// Create new auto reply
router.post("/", requireActiveSubscription, requirePackageService("facebook"), createAutoReply);

// Get single auto reply
router.get("/:id", getAutoReply);

// Update auto reply
router.patch("/:id", requireActiveSubscription, requirePackageService("facebook"), updateAutoReply);

// Delete auto reply
router.delete("/:id", requireActiveSubscription, requirePackageService("facebook"), deleteAutoReply);

// Toggle auto reply status
router.patch("/:id/toggle", requireActiveSubscription, requirePackageService("facebook"), toggleAutoReplyStatus);

// Process incoming comment
router.post("/process-comment", requireActiveSubscription, requirePackageService("facebook"), processComment);

module.exports = router;
