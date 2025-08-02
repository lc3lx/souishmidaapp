const express = require("express");
const { protect } = require("../controllers/auth.Controller");
const transactionController = require("../controllers/transactionController");

const router = express.Router();

// Admin only (you may want to add isAdmin middleware)
router.use(protect);
router.post("/", transactionController.createTransaction);
router.get("/", transactionController.getAllTransactions);
router.get("/:id", transactionController.getTransaction);

module.exports = router;
