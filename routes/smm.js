const express = require('express');
const { body, param, query } = require('express-validator');
const auth = require('../controllers/auth.Controller');
const SMMController = require('../controllers/SMMController');

const router = express.Router();

// Validation middleware
const validateProvider = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('اسم المقدم يجب أن يكون بين 2 و 50 حرف'),
  body('displayName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('الاسم المعروض يجب أن يكون بين 2 و 100 حرف'),
  body('apiUrl')
    .isURL()
    .withMessage('رابط API غير صحيح'),
  body('apiKey')
    .trim()
    .isLength({ min: 10 })
    .withMessage('مفتاح API يجب أن يكون على الأقل 10 أحرف'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('الأولوية يجب أن تكون بين 1 و 10')
];

const validateOrder = [
  body('providerId')
    .isMongoId()
    .withMessage('معرف مقدم الخدمة غير صحيح'),
  body('serviceId')
    .trim()
    .notEmpty()
    .withMessage('معرف الخدمة مطلوب'),
  body('link')
    .isURL()
    .withMessage('الرابط غير صحيح'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('الكمية يجب أن تكون رقم صحيح أكبر من 0'),
  body('customComments')
    .optional()
    .isArray()
    .withMessage('التعليقات المخصصة يجب أن تكون مصفوفة')
];

const validateId = [
  param('id')
    .isMongoId()
    .withMessage('المعرف غير صحيح')
];

// @route   GET /api/smm/providers
// @desc    Get all SMM providers
// @access  Private
router.get('/providers', auth.protect, SMMController.getProviders);

// Admin: Update adminProfit for a specific service in a provider
router.patch(
  '/providers/:providerId/services/:serviceId/admin-profit',
  auth.protect,
  auth.allowedTo('admin'),
  (req, res, next) => {
    // Inject providerId and serviceId into body for controller
    req.body.providerId = req.params.providerId;
    req.body.serviceId = req.params.serviceId;
    next();
  },
  SMMController.updateServiceAdminProfit
);


// @route   POST /api/smm/providers
// @desc    Add new SMM provider
// @access  Private
router.post('/providers', auth.protect, validateProvider, SMMController.addProvider);

// @route   PUT /api/smm/providers/:id
// @desc    Update SMM provider
// @access  Private
router.put('/providers/:id', auth.protect, validateId, SMMController.updateProvider);

// @route   DELETE /api/smm/providers/:id
// @desc    Delete SMM provider
// @access  Private
router.delete('/providers/:id', auth.protect, validateId, SMMController.deleteProvider);

// @route   PATCH /api/smm/providers/:id/toggle
// @desc    Toggle provider status (active/inactive)
// @access  Private
router.patch('/providers/:id/toggle', auth.protect, validateId, SMMController.toggleProvider);

// @route   POST /api/smm/providers/:id/sync
// @desc    Sync provider services
// @access  Private
router.post('/providers/:id/sync', auth.protect, validateId, SMMController.syncServices);

// @route   GET /api/smm/providers/:id/services
// @desc    Get provider services
// @access  Private
router.get('/providers/:id/services', auth.protect, validateId, SMMController.getServices);

// @route   POST /api/smm/orders
// @desc    Create new SMM order
// @access  Private
router.post('/orders', auth.protect, validateOrder, SMMController.createOrder);

// @route   GET /api/smm/orders
// @desc    Get user's SMM orders
// @access  Private
router.get('/orders', auth.protect, SMMController.getOrders);

// @route   GET /api/smm/orders/:id
// @desc    Get specific SMM order
// @access  Private
router.get('/orders/:id', auth.protect, validateId, async (req, res) => {
  try {
    const SMMOrder = require('../models/SMMOrder');
    
    const order = await SMMOrder.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('provider', 'displayName');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }
    
    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلب'
    });
  }
});

// @route   POST /api/smm/orders/:id/refill
// @desc    Create refill for order
// @access  Private
router.post('/orders/:id/refill', auth.protect, validateId, async (req, res) => {
  try {
    const SMMOrder = require('../models/SMMOrder');
    const SMMService = require('../utils/smmService');
    
    const order = await SMMOrder.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('provider');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }
    
    if (!order.canRefill()) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إعادة تعبئة هذا الطلب'
      });
    }
    
    const smmService = new SMMService(order.provider);
    const refill = await smmService.createRefill(order.externalOrderId);
    
    order.refillId = refill.refill;
    await order.save();
    
    res.json({
      success: true,
      message: 'تم إنشاء طلب إعادة التعبئة بنجاح',
      data: { refill }
    });
  } catch (error) {
    console.error('Create refill error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء طلب إعادة التعبئة'
    });
  }
});

// @route   POST /api/smm/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.post('/orders/:id/cancel', auth.protect, validateId, async (req, res) => {
  try {
    const SMMOrder = require('../models/SMMOrder');
    const SMMService = require('../utils/smmService');
    
    const order = await SMMOrder.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('provider');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }
    
    if (!order.canCancel()) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إلغاء هذا الطلب'
      });
    }
    
    const smmService = new SMMService(order.provider);
    const cancel = await smmService.cancelOrder(order.externalOrderId);
    
    if (cancel.cancel) {
      order.cancelId = cancel.cancel;
      order.status = 'Canceled';
      await order.save();
    }
    
    res.json({
      success: true,
      message: 'تم إلغاء الطلب بنجاح',
      data: { cancel }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء الطلب'
    });
  }
});

// @route   GET /api/smm/analytics/summary
// @desc    Get SMM analytics summary
// @access  Private
router.get('/analytics/summary', auth.protect, async (req, res) => {
  try {
    const SMMOrder = require('../models/SMMOrder');
    const SMMProvider = require('../models/SMMProvider');
    
    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      totalSpent,
      activeProviders
    ] = await Promise.all([
      SMMOrder.countDocuments({ user: req.user.id }),
      SMMOrder.countDocuments({ user: req.user.id, status: 'Completed' }),
      SMMOrder.countDocuments({ 
        user: req.user.id, 
        status: { $in: ['Pending', 'In progress', 'Processing'] }
      }),
      SMMOrder.aggregate([
        { $match: { user: req.user.id } },
        { $group: { _id: null, total: { $sum: '$charge' } } }
      ]),
      SMMProvider.countDocuments({ createdBy: req.user.id, isActive: true })
    ]);
    
    const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        pendingOrders,
        totalSpent: totalSpent[0]?.total || 0,
        activeProviders,
        successRate: Math.round(successRate * 100) / 100
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات'
    });
  }
});

// @route   POST /api/smm/providers/test
// @desc    Test SMM provider connection
// @access  Private
router.post('/providers/test', auth.protect, [
  body('apiUrl').isURL().withMessage('رابط API غير صحيح'),
  body('apiKey').trim().notEmpty().withMessage('مفتاح API مطلوب')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: errors.array()
      });
    }
    
    const { apiUrl, apiKey } = req.body;
    const SMMService = require('../utils/smmService');
    
    // Create temporary provider object for testing
    const tempProvider = {
      apiUrl,
      apiKey,
      settings: { timeout: 10000, retryAttempts: 1 },
      updateStats: () => Promise.resolve()
    };
    
    const smmService = new SMMService(tempProvider);
    const result = await smmService.testConnection();
    
    res.json({
      success: result.success,
      message: result.success ? 'الاتصال ناجح' : 'فشل في الاتصال',
      data: result
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في اختبار الاتصال'
    });
  }
});

module.exports = router;

