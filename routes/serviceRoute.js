const express = require("express");
const serviceController = require("../controllers/serviceController");
const { protect, allowedTo } = require("../controllers/auth.Controller");

const router = express.Router();

// Public routes
router.route("/").get(serviceController.getAllServices);

router.route("/:id").get(serviceController.getService);

// Protected routes (require authentication)
router.use(protect);

// Admin only routes
router.use(allowedTo("admin"));

router.route("/").post(serviceController.createService);

router
  .route("/:id")
  .patch(serviceController.updateService)
  .delete(serviceController.deleteService);

router.route("/:id/toggle-status").patch(serviceController.toggleServiceStatus);

module.exports = router;
