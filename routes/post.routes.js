const express = require("express");
const { protect } = require("../controllers/auth.Controller.js");
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  publishPost,
} = require("../controllers/post.controller.js");

const { requireActiveSubscription, requirePackageService } = require("../middleware/subscriptionMiddleware");
const router = express.Router();

// Protect all routes
router.use(protect);

// Get all posts
router.get("/", getPosts);

// Create new post (requires active subscription and Facebook service in package)
router.post("/", requireActiveSubscription, requirePackageService("facebook"), createPost);

// Get single post
router.get("/:id", getPost);

// Update post (requires active subscription)
router.patch("/:id", requireActiveSubscription, updatePost);

// Delete post
router.delete("/:id", deletePost);

// Publish post immediately (requires active subscription)
router.post("/:id/publish", requireActiveSubscription, publishPost);

module.exports = router;
