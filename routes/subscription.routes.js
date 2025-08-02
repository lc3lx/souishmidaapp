const express = require("express");
const { protect } = require("../controllers/auth.Controller");
const subscriptionController = require("../controllers/subscriptionController");

const router = express.Router();

// User subscribes to a package
router.post("/subscribe", protect, subscriptionController.subscribeToPackage);

// User gets his active subscription
router.get("/my", protect, subscriptionController.getMySubscription);

// Admin: get all subscriptions
router.get("/", protect, subscriptionController.getAllSubscriptions);

module.exports = router;
