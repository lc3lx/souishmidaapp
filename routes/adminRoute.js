const express = require("express");
const adminController = require("../controllers/adminController");
const { protect, allowedTo } = require("../controllers/auth.Controller");

const router = express.Router();

// Protect all routes and restrict to admin only
router.use(protect, allowedTo("admin"));

// User management
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUser);
router.patch("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);
router.patch(
  "/users/:userId/subscription",
  adminController.manageUserSubscription
);

// Offer management
router.post("/offers", adminController.manageOffer);

// Service management
router.patch(
  "/services/:id/toggle-status",
  adminController.toggleServiceStatus
);

// Statistics
router.get("/statistics", adminController.getStatistics);
router.patch(
  "/settings/referral-percent",
  protect,
  allowedTo("admin"),
  adminController.updateReferralPercent
);

router.post("/gift/subscription", protect, adminController.giftSubscription);

module.exports = router;
