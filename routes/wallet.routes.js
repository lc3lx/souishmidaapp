const express = require("express");
const walletController = require("../controllers/walletController");
const { protect, allowedTo } = require("../controllers/auth.Controller");

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// User routes
router.get("/balance", walletController.getWalletBalance);
router.get("/transactions", walletController.getTransactions);
router.post("/deduct-funds", walletController.deductFunds);

// Admin routes
router.use(allowedTo("admin"));
router.post("/add-funds/:userId", walletController.addFunds);

module.exports = router;
