const Service = require("../models/serviceModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// @desc    Create a new service
// @route   POST /api/v1/services
// @access  Private/Admin
exports.createService = catchAsync(async (req, res, next) => {
  const existing = await Service.findOne({ name: req.body.name });
  if (existing) {
    return next(new AppError("هذه الخدمة موجودة بالفعل", 400));
  }
  const newService = await Service.create(req.body);

  res.status(201).json({
    status: "success",
    data: {
      service: newService,
    },
  });
});

// @desc    Get all services
// @route   GET /api/v1/services
// @access  Public
exports.getAllServices = catchAsync(async (req, res, next) => {
  // Filtering
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete queryObj[el]);

  // Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  let query = Service.find(JSON.parse(queryStr));

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("-__v");
  }

  // Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  const total = await Service.countDocuments(JSON.parse(queryStr));

  query = query.skip(skip).limit(limit);

  const services = await query;

  // Send response
  res.status(200).json({
    status: "success",
    results: services.length,
    total,
    data: {
      services,
    },
  });
});

// @desc    Get single service
// @route   GET /api/v1/services/:id
// @access  Public
exports.getService = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError("لم يتم العثور على الخدمة بهذا المعرف", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      service,
    },
  });
});

// @desc    Update service
// @route   PATCH /api/v1/services/:id
// @access  Private/Admin
exports.updateService = catchAsync(async (req, res, next) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!service) {
    return next(new AppError("لم يتم العثور على الخدمة بهذا المعرف", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      service,
    },
  });
});

// @desc    Delete service
// @route   DELETE /api/v1/services/:id
// @access  Private/Admin
exports.deleteService = catchAsync(async (req, res, next) => {
  const service = await Service.findByIdAndDelete(req.params.id);

  if (!service) {
    return next(new AppError("لم يتم العثور على الخدمة بهذا المعرف", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// @desc    Toggle service status
// @route   PATCH /api/v1/services/:id/toggle-status
// @access  Private/Admin
exports.toggleServiceStatus = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError("لم يتم العثور على الخدمة بهذا المعرف", 404));
  }

  service.isActive = !service.isActive;
  await service.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    data: {
      service,
    },
  });
});
