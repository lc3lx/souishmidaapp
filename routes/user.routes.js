const express = require("express");
const { protect } = require("../controllers/auth.Controller");
const {
  getProfile,
  updateProfile,
  getWallet,
  addFunds,
  getReferralStats,
} = require("../controllers/user.controller");

const router = express.Router();

// Protect all routes
router.use(protect);

// Profile routes
router.get("/profile", getProfile);
router.patch("/profile", updateProfile);

// Wallet routes
router.get("/wallet", getWallet);
router.post("/wallet/add-funds", addFunds);

// Referral routes
router.get("/referrals", getReferralStats);

module.exports = router;
