const SMMProvider = require('../models/SMMProvider');
const SMMOrder = require('../models/SMMOrder');
const SMMService = require('../utils/smmService');
const { validationResult } = require('express-validator');

class SMMController {
  // Get all SMM providers
  static async getProviders(req, res) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      const query = { createdBy: req.user.id };
      
      if (status) {
        query.isActive = status === 'active';
      }
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { displayName: { $regex: search, $options: 'i' } }
        ];
      }
      
      const providers = await SMMProvider.find(query)
        .sort({ priority: 1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-apiKey -password');
      
      const total = await SMMProvider.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          providers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get providers error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب مقدمي الخدمة'
      });
    }
  }

  // Add new SMM provider
  static async addProvider(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: errors.array()
        });
      }

      const { name, displayName, apiUrl, apiKey, username, password, priority } = req.body;
      
      // Check if provider already exists
      const existingProvider = await SMMProvider.findOne({ 
        $or: [
          { name: name.toLowerCase() },
          { apiUrl }
        ]
      });
      
      if (existingProvider) {
        return res.status(400).json({
          success: false,
          message: 'مقدم الخدمة موجود بالفعل'
        });
      }

      const provider = new SMMProvider({
        name: name.toLowerCase(),
        displayName,
        apiUrl,
        apiKey,
        username,
        password,
        priority: priority || 1,
        createdBy: req.user.id
      });

      await provider.save();

      // Sync services from the provider
      try {
        await SMMController.syncProviderServices(provider);
      } catch (syncError) {
        console.error('Service sync error:', syncError);
        // Continue even if sync fails
      }

      res.status(201).json({
        success: true,
        message: 'تم إضافة مقدم الخدمة بنجاح',
        data: {
          provider: {
            ...provider.toObject(),
            apiKey: undefined,
            password: undefined
          }
        }
      });
    } catch (error) {
      console.error('Add provider error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إضافة مقدم الخدمة'
      });
    }
  }

  // Update SMM provider
  static async updateProvider(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const provider = await SMMProvider.findOne({ 
        _id: id, 
        createdBy: req.user.id 
      });
      
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'مقدم الخدمة غير موجود'
        });
      }

      // Update allowed fields
      const allowedUpdates = ['displayName', 'apiUrl', 'apiKey', 'username', 'password', 'priority', 'isActive'];
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          provider[field] = updates[field];
        }
      });

      await provider.save();

      res.json({
        success: true,
        message: 'تم تحديث مقدم الخدمة بنجاح',
        data: {
          provider: {
            ...provider.toObject(),
            apiKey: undefined,
            password: undefined
          }
        }
      });
    } catch (error) {
      console.error('Update provider error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث مقدم الخدمة'
      });
    }
  }

  // Delete SMM provider
  static async deleteProvider(req, res) {
    try {
      const { id } = req.params;
      
      const provider = await SMMProvider.findOne({ 
        _id: id, 
        createdBy: req.user.id 
      });
      
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'مقدم الخدمة غير موجود'
        });
      }

      // Check if there are pending orders
      const pendingOrders = await SMMOrder.countDocuments({
        provider: id,
        status: { $in: ['Pending', 'In progress', 'Processing'] }
      });

      if (pendingOrders > 0) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن حذف مقدم الخدمة لوجود طلبات معلقة'
        });
      }

      await SMMProvider.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'تم حذف مقدم الخدمة بنجاح'
      });
    } catch (error) {
      console.error('Delete provider error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف مقدم الخدمة'
      });
    }
  }

  // Toggle provider status
  static async toggleProvider(req, res) {
    try {
      const { id } = req.params;
      
      const provider = await SMMProvider.findOne({ 
        _id: id, 
        createdBy: req.user.id 
      });
      
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'مقدم الخدمة غير موجود'
        });
      }

      provider.isActive = !provider.isActive;
      await provider.save();

      res.json({
        success: true,
        message: `تم ${provider.isActive ? 'تفعيل' : 'إيقاف'} مقدم الخدمة بنجاح`,
        data: {
          provider: {
            ...provider.toObject(),
            apiKey: undefined,
            password: undefined
          }
        }
      });
    } catch (error) {
      console.error('Toggle provider error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تغيير حالة مقدم الخدمة'
      });
    }
  }

  // Sync provider services
  static async syncServices(req, res) {
    try {
      const { id } = req.params;
      
      const provider = await SMMProvider.findOne({ 
        _id: id, 
        createdBy: req.user.id 
      });
      
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'مقدم الخدمة غير موجود'
        });
      }

      await SMMController.syncProviderServices(provider);

      res.json({
        success: true,
        message: 'تم مزامنة الخدمات بنجاح',
        data: {
          provider: {
            ...provider.toObject(),
            apiKey: undefined,
            password: undefined
          }
        }
      });
    } catch (error) {
      console.error('Sync services error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في مزامنة الخدمات'
      });
    }
  }

  // Get provider services
  static async getServices(req, res) {
    try {
      const { id } = req.params;
      const { category, search, active } = req.query;
      
      const provider = await SMMProvider.findOne({ 
        _id: id, 
        createdBy: req.user.id 
      });
      
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'مقدم الخدمة غير موجود'
        });
      }

      let services = provider.supportedServices;

      // Apply filters
      if (category) {
        services = services.filter(service => 
          service.category.toLowerCase().includes(category.toLowerCase())
        );
      }

      if (search) {
        services = services.filter(service => 
          service.serviceName.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (active !== undefined) {
        services = services.filter(service => 
          service.isActive === (active === 'true')
        );
      }

      res.json({
        success: true,
        data: {
          services,
          total: services.length
        }
      });
    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الخدمات'
      });
    }
  }

  // Create SMM order
  static async createOrder(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'بيانات غير صحيحة',
          errors: errors.array()
        });
      }

      const { providerId, serviceId, link, quantity, customComments } = req.body;
      
      const provider = await SMMProvider.findOne({ 
        _id: providerId, 
        isActive: true 
      });
      
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'مقدم الخدمة غير متاح'
        });
      }

      const service = provider.supportedServices.find(s => 
        s.serviceId === serviceId && s.isActive
      );
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'الخدمة غير متاحة'
        });
      }

      // Validate quantity
      if (quantity < service.min || quantity > service.max) {
        return res.status(400).json({
          success: false,
          message: `الكمية يجب أن تكون بين ${service.min} و ${service.max}`
        });
      }

      // Calculate charge
      const charge = (service.rate * quantity) / 1000;

      // Create order via SMM service
      const smmService = new SMMService(provider);
      const externalOrder = await smmService.createOrder({
        service: serviceId,
        link,
        quantity,
        comments: customComments
      });

      // Create internal order record
      const order = new SMMOrder({
        orderId: SMMOrder.generateOrderId(),
        externalOrderId: externalOrder.order,
        provider: providerId,
        user: req.user.id,
        service: {
          serviceId: service.serviceId,
          serviceName: service.serviceName,
          category: service.category
        },
        link,
        quantity,
        charge,
        customComments: customComments || [],
        currency: provider.currency
      });

      await order.save();

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الطلب بنجاح',
        data: { order }
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء الطلب'
      });
    }
  }

  // Get orders
  static async getOrders(req, res) {
    try {
      const { page = 1, limit = 10, status, provider } = req.query;
      const query = { user: req.user.id };
      
      if (status) {
        query.status = status;
      }
      
      if (provider) {
        query.provider = provider;
      }
      
      const orders = await SMMOrder.find(query)
        .populate('provider', 'displayName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await SMMOrder.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الطلبات'
      });
    }
  }

  // Helper method to sync provider services
  static async syncProviderServices(provider) {
    try {
      const smmService = new SMMService(provider);
      const services = await smmService.getServices();
      
      provider.supportedServices = services.map(service => ({
        serviceId: service.service.toString(),
        serviceName: service.name,
        category: service.category,
        type: service.type,
        rate: parseFloat(service.rate),
        min: parseInt(service.min),
        max: parseInt(service.max),
        refill: service.refill || false,
        cancel: service.cancel || false,
        isActive: true
      }));
      
      await provider.syncServices();
      
      // Update balance
      const balance = await smmService.getBalance();
      provider.balance = parseFloat(balance.balance);
      provider.currency = balance.currency;
      
      await provider.save();
    } catch (error) {
      console.error('Sync provider services error:', error);
      throw error;
    }
  }
}

module.exports = SMMController;

