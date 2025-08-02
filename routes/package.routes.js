const express = require("express");
const { protect } = require("../controllers/auth.controller");
const packageController = require("../controllers/packageController");

const router = express.Router();

// Public: Get all packages, get single package
router.get("/", packageController.getAllPackages);
router.get("/:id", packageController.getPackage);

// Admin: Create, update, delete package
router.use(protect); // Requires authentication
// (You may want to add an isAdmin middleware here)
router.post("/", packageController.createPackage);
router.patch("/:id", packageController.updatePackage);
router.delete("/:id", packageController.deletePackage);

module.exports = router;
