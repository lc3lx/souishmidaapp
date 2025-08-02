const SMMProvider = require('../models/SMMProvider');

// Default SMM providers configuration
const defaultProviders = [
  {
    name: 'justanotherpanel',
    displayName: 'Just Another Panel',
    apiUrl: 'https://justanotherpanel.com/api/v2',
    username: 'Husamberho',
    password: '12344321Aa$',
    priority: 1,
    description: 'High-quality SMM services with fast delivery'
  },
  {
    name: 'smmkings',
    displayName: 'SMM Kings',
    apiUrl: 'https://smmkings.com/api/v2',
    username: 'Husamberho',
    password: '12344321Aa$',
    priority: 2,
    description: 'Premium SMM services for all social media platforms'
  },
  {
    name: 'secsers',
    displayName: 'Secsers',
    apiUrl: 'https://secsers.com/api/v2',
    username: 'Husamberho',
    password: '12344321Aa$',
    priority: 3,
    description: 'Reliable SMM services with competitive pricing'
  }
];

// Function to initialize default providers
async function initializeDefaultProviders(userId, apiKeys = {}) {
  try {
    const providers = [];
    
    for (const providerConfig of defaultProviders) {
      // Check if provider already exists
      const existingProvider = await SMMProvider.findOne({
        name: providerConfig.name,
        createdBy: userId
      });
      
      if (!existingProvider) {
        // Get API key from provided keys or use placeholder
        const apiKey = apiKeys[providerConfig.name] || 'YOUR_API_KEY_HERE';
        
        const provider = new SMMProvider({
          name: providerConfig.name,
          displayName: providerConfig.displayName,
          apiUrl: providerConfig.apiUrl,
          apiKey: apiKey,
          username: providerConfig.username,
          password: providerConfig.password,
          priority: providerConfig.priority,
          isActive: apiKey !== 'YOUR_API_KEY_HERE', // Only activate if real API key provided
          createdBy: userId,
          settings: {
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            autoSync: true,
            syncInterval: 3600000 // 1 hour
          }
        });
        
        await provider.save();
        providers.push(provider);
        
        console.log(`✅ Initialized provider: ${providerConfig.displayName}`);
      } else {
        console.log(`ℹ️  Provider already exists: ${providerConfig.displayName}`);
      }
    }
    
    return providers;
  } catch (error) {
    console.error('Error initializing default providers:', error);
    throw error;
  }
}

// Function to update provider API key
async function updateProviderApiKey(userId, providerName, apiKey) {
  try {
    const provider = await SMMProvider.findOne({
      name: providerName.toLowerCase(),
      createdBy: userId
    });
    
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    provider.apiKey = apiKey;
    provider.isActive = true;
    await provider.save();
    
    console.log(`✅ Updated API key for provider: ${provider.displayName}`);
    return provider;
  } catch (error) {
    console.error('Error updating provider API key:', error);
    throw error;
  }
}

// Function to sync all active providers
async function syncAllProviders(userId) {
  try {
    const providers = await SMMProvider.find({
      createdBy: userId,
      isActive: true
    });
    
    const SMMService = require('./smmService');
    const results = [];
    
    for (const provider of providers) {
      try {
        const smmService = new SMMService(provider);
        
        // Test connection first
        const connectionTest = await smmService.testConnection();
        if (!connectionTest.success) {
          console.log(`❌ Connection failed for ${provider.displayName}: ${connectionTest.error}`);
          results.push({
            provider: provider.displayName,
            success: false,
            error: connectionTest.error
          });
          continue;
        }
        
        // Sync services
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
        
        // Update balance
        const balance = await smmService.getBalance();
        provider.balance = parseFloat(balance.balance);
        provider.currency = balance.currency;
        
        await provider.syncServices();
        
        results.push({
          provider: provider.displayName,
          success: true,
          servicesCount: services.length,
          balance: provider.balance,
          currency: provider.currency
        });
        
        console.log(`✅ Synced ${provider.displayName}: ${services.length} services, Balance: ${provider.balance} ${provider.currency}`);
      } catch (error) {
        console.log(`❌ Sync failed for ${provider.displayName}: ${error.message}`);
        results.push({
          provider: provider.displayName,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error syncing providers:', error);
    throw error;
  }
}

// Function to get provider statistics
async function getProviderStatistics(userId) {
  try {
    const providers = await SMMProvider.find({ createdBy: userId });
    const SMMOrder = require('../models/SMMOrder');
    
    const stats = {
      total: providers.length,
      active: providers.filter(p => p.isActive).length,
      inactive: providers.filter(p => !p.isActive).length,
      totalServices: 0,
      totalBalance: 0,
      providers: []
    };
    
    for (const provider of providers) {
      const orders = await SMMOrder.find({ provider: provider._id });
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'Completed').length;
      const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      
      stats.totalServices += provider.supportedServices.length;
      stats.totalBalance += provider.balance || 0;
      
      stats.providers.push({
        name: provider.displayName,
        isActive: provider.isActive,
        servicesCount: provider.supportedServices.length,
        balance: provider.balance || 0,
        currency: provider.currency,
        totalOrders,
        successRate: Math.round(successRate * 100) / 100,
        lastSync: provider.lastSyncAt
      });
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting provider statistics:', error);
    throw error;
  }
}

// Function to cleanup inactive providers
async function cleanupInactiveProviders(userId, daysInactive = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    
    const inactiveProviders = await SMMProvider.find({
      createdBy: userId,
      isActive: false,
      updatedAt: { $lt: cutoffDate }
    });
    
    const SMMOrder = require('../models/SMMOrder');
    const results = [];
    
    for (const provider of inactiveProviders) {
      // Check if provider has any orders
      const orderCount = await SMMOrder.countDocuments({ provider: provider._id });
      
      if (orderCount === 0) {
        await SMMProvider.findByIdAndDelete(provider._id);
        results.push({
          provider: provider.displayName,
          action: 'deleted',
          reason: 'No orders found'
        });
      } else {
        results.push({
          provider: provider.displayName,
          action: 'kept',
          reason: `Has ${orderCount} orders`
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error cleaning up providers:', error);
    throw error;
  }
}

module.exports = {
  defaultProviders,
  initializeDefaultProviders,
  updateProviderApiKey,
  syncAllProviders,
  getProviderStatistics,
  cleanupInactiveProviders
};

