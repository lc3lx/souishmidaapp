const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const socialAccountRoutes = require("./routes/socialAccount.routes");
const postRoutes = require("./routes/post.routes");
const productRoutes = require("./routes/product.routes");
const autoReplyRoutes = require("./routes/autoReply.routes");
const broadcastRoutes = require("./routes/broadcast.routes");
const walletRoutes = require("./routes/wallet.routes");
const packageRoutes = require("./routes/package.routes");
const referralRoutes = require("./routes/referral.routes");

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/social-accounts", socialAccountRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/products", productRoutes);
app.use("/api/auto-replies", autoReplyRoutes);
//app.use("/api/broadcasts", broadcastRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/packages", packageRoutes);
app.use("/api/v1/transactions", require("./routes/transaction.routes"));
app.use("/api/v1/subscriptions", require("./routes/subscription.routes"));
app.use("/api/v1/referrals", referralRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

module.exports = app;
