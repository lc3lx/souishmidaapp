const express = require("express");
const { protect } = require("../controllers/auth.Controller");
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} = require("../controllers/product.controller");

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all products
router.get("/", getProducts);

// Create new product
router.post("/", createProduct);

// Get single product
router.get("/:id", getProduct);

// Update product
router.patch("/:id", updateProduct);

// Delete product
router.delete("/:id", deleteProduct);

// Toggle product status
router.patch("/:id/toggle", toggleProductStatus);

module.exports = router;
