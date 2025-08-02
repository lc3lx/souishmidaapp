const Subscription = require("../models/subscriptionModel");
const Package = require("../models/packageModel");
const AppError = require("../utils/appError");

// Middleware: Require active subscription for protected actions
exports.requireActiveSubscription = async (req, res, next) => {
  const userId = req.user.id;
  const subscription = await Subscription.findOne({ user: userId, isActive: true }).populate("package");

  if (!subscription || !subscription.package || !subscription.package.isActive) {
    return next(new AppError("لا يوجد لديك اشتراك نشط أو الباقة غير متاحة", 403));
  }

  // Attach subscription/package info for downstream checks
  req.activeSubscription = subscription;
  req.activePackage = subscription.package;
  next();
};

// Middleware: Require that package includes a specific service
exports.requirePackageService = (serviceName) => {
  return async (req, res, next) => {
    const pkg = req.activePackage;
    if (!pkg) return next(new AppError("لا يوجد باقة نشطة", 403));
    // Assume serviceName is the Service _id or name
    const hasService = pkg.services.some(
      (srv) => srv.name === serviceName || srv._id.toString() === serviceName
    );
    if (!hasService) {
      return next(new AppError(`باكتك الحالية لا تدعم هذه الخدمة: ${serviceName}`, 403));
    }
    next();
  };
};
