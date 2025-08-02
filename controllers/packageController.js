const Package = require("../models/packageModel");
const Service = require("../models/serviceModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// @desc    Create a new package
// @route   POST /api/v1/packages
// @access  Private/Admin
exports.createPackage = catchAsync(async (req, res, next) => {
  const { name, description, price, duration, services, isActive } = req.body;

  // Optional: Validate services IDs
  if (services && services.length > 0) {
    const validServices = await Service.find({ _id: { $in: services } });
    if (validServices.length !== services.length) {
      return next(new AppError("بعض الخدمات غير موجودة", 400));
    }
  }

  const newPackage = await Package.create({
    name,
    description,
    price,
    duration,
    services,
    isActive,
  });

  res.status(201).json({
    status: "success",
    data: { package: newPackage },
  });
});

// @desc    Get all packages
// @route   GET /api/v1/packages
// @access  Public/Admin
exports.getAllPackages = catchAsync(async (req, res, next) => {
  const packages = await Package.find().populate("services");
  res.status(200).json({
    status: "success",
    results: packages.length,
    data: { packages },
  });
});

// @desc    Get single package
// @route   GET /api/v1/packages/:id
// @access  Public/Admin
exports.getPackage = catchAsync(async (req, res, next) => {
  const pkg = await Package.findById(req.params.id).populate("services");
  if (!pkg) return next(new AppError("الباقة غير موجودة", 404));
  res.status(200).json({ status: "success", data: { package: pkg } });
});

// @desc    Update package
// @route   PATCH /api/v1/packages/:id
// @access  Private/Admin
exports.updatePackage = catchAsync(async (req, res, next) => {
  const { services } = req.body;
  if (services && services.length > 0) {
    const validServices = await Service.find({ _id: { $in: services } });
    if (validServices.length !== services.length) {
      return next(new AppError("بعض الخدمات غير موجودة", 400));
    }
  }
  const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("services");
  if (!pkg) return next(new AppError("الباقة غير موجودة", 404));
  res.status(200).json({ status: "success", data: { package: pkg } });
});

// @desc    Delete package
// @route   DELETE /api/v1/packages/:id
// @access  Private/Admin
exports.deletePackage = catchAsync(async (req, res, next) => {
  const pkg = await Package.findByIdAndDelete(req.params.id);
  if (!pkg) return next(new AppError("الباقة غير موجودة", 404));
  res.status(204).json({ status: "success", data: null });
});
