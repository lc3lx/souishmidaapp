const express = require("express");
const { protect } = require("../controllers/auth.Controller");
const {
  getSocialAccounts,
  connectAccount,
  updateAccount,
  disconnectAccount,
  getAccountAnalytics,
} = require("../controllers/socialAccount.controller");

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all accounts
router.get("/", getSocialAccounts);

// Connect new account
router.post("/", connectAccount);

// Update account
router.patch("/:id", updateAccount);

// Disconnect account
router.delete("/:id", disconnectAccount);

// Get account analytics
router.get("/:id/analytics", getAccountAnalytics);

module.exports = router;
