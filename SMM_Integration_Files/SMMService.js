const axios = require('axios');

class SMMService {
  constructor(provider) {
    this.provider = provider;
    this.apiUrl = provider.apiUrl;
    this.apiKey = provider.apiKey;
    this.timeout = provider.settings?.timeout || 30000;
    this.retryAttempts = provider.settings?.retryAttempts || 3;
    this.retryDelay = provider.settings?.retryDelay || 1000;
  }

  // Create axios instance with default config
  createAxiosInstance() {
    return axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SocialMediaManager/1.0'
      }
    });
  }

  // Make API request with retry logic
  async makeRequest(action, params = {}, retryCount = 0) {
    try {
      const axiosInstance = this.createAxiosInstance();
      const requestData = new URLSearchParams({
        key: this.apiKey,
        action,
        ...params
      });

      const startTime = Date.now();
      const response = await axiosInstance.post('', requestData);
      const responseTime = Date.now() - startTime;

      // Update provider stats
      await this.provider.updateStats(true, 0, responseTime);

      return response.data;
    } catch (error) {
      console.error(`SMM API Error (${action}):`, error.message);
      
      // Retry logic
      if (retryCount < this.retryAttempts) {
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.makeRequest(action, params, retryCount + 1);
      }

      // Update provider stats for failed request
      await this.provider.updateStats(false, 0, 0);
      
      throw new Error(`SMM API request failed: ${error.message}`);
    }
  }

  // Get available services
  async getServices() {
    try {
      const response = await this.makeRequest('services');
      
      if (Array.isArray(response)) {
        return response;
      }
      
      throw new Error('Invalid services response format');
    } catch (error) {
      console.error('Get services error:', error);
      throw error;
    }
  }

  // Create new order
  async createOrder({ service, link, quantity, comments = [] }) {
    try {
      const params = {
        service,
        link,
        quantity: quantity.toString()
      };

      // Add custom comments if provided
      if (comments && comments.length > 0) {
        params.comments = comments.join('\n');
      }

      const response = await this.makeRequest('add', params);
      
      if (response.order) {
        return response;
      }
      
      throw new Error(response.error || 'Failed to create order');
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }

  // Get order status
  async getOrderStatus(orderId) {
    try {
      const response = await this.makeRequest('status', {
        order: orderId
      });
      
      if (response.charge !== undefined) {
        return response;
      }
      
      throw new Error(response.error || 'Failed to get order status');
    } catch (error) {
      console.error('Get order status error:', error);
      throw error;
    }
  }

  // Get multiple orders status
  async getMultipleOrdersStatus(orderIds) {
    try {
      const response = await this.makeRequest('status', {
        orders: orderIds.join(',')
      });
      
      return response;
    } catch (error) {
      console.error('Get multiple orders status error:', error);
      throw error;
    }
  }

  // Create refill
  async createRefill(orderId) {
    try {
      const response = await this.makeRequest('refill', {
        order: orderId
      });
      
      if (response.refill) {
        return response;
      }
      
      throw new Error(response.error || 'Failed to create refill');
    } catch (error) {
      console.error('Create refill error:', error);
      throw error;
    }
  }

  // Get refill status
  async getRefillStatus(refillId) {
    try {
      const response = await this.makeRequest('refill_status', {
        refill: refillId
      });
      
      if (response.status) {
        return response;
      }
      
      throw new Error(response.error || 'Failed to get refill status');
    } catch (error) {
      console.error('Get refill status error:', error);
      throw error;
    }
  }

  // Get multiple refills status
  async getMultipleRefillsStatus(refillIds) {
    try {
      const response = await this.makeRequest('refill_status', {
        refills: refillIds.join(',')
      });
      
      return response;
    } catch (error) {
      console.error('Get multiple refills status error:', error);
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(orderId) {
    try {
      const response = await this.makeRequest('cancel', {
        order: orderId
      });
      
      return response;
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  // Cancel multiple orders
  async cancelMultipleOrders(orderIds) {
    try {
      const response = await this.makeRequest('cancel', {
        orders: orderIds.join(',')
      });
      
      return response;
    } catch (error) {
      console.error('Cancel multiple orders error:', error);
      throw error;
    }
  }

  // Get account balance
  async getBalance() {
    try {
      const response = await this.makeRequest('balance');
      
      if (response.balance !== undefined) {
        return response;
      }
      
      throw new Error(response.error || 'Failed to get balance');
    } catch (error) {
      console.error('Get balance error:', error);
      throw error;
    }
  }

  // Test API connection
  async testConnection() {
    try {
      const balance = await this.getBalance();
      return {
        success: true,
        balance: balance.balance,
        currency: balance.currency
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Utility method for delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get provider-specific service categories
  getServiceCategories(services) {
    const categories = new Set();
    services.forEach(service => {
      if (service.category) {
        categories.add(service.category);
      }
    });
    return Array.from(categories).sort();
  }

  // Filter services by criteria
  filterServices(services, criteria = {}) {
    let filtered = [...services];

    if (criteria.category) {
      filtered = filtered.filter(service => 
        service.category.toLowerCase().includes(criteria.category.toLowerCase())
      );
    }

    if (criteria.type) {
      filtered = filtered.filter(service => 
        service.type.toLowerCase().includes(criteria.type.toLowerCase())
      );
    }

    if (criteria.minRate !== undefined) {
      filtered = filtered.filter(service => 
        parseFloat(service.rate) >= criteria.minRate
      );
    }

    if (criteria.maxRate !== undefined) {
      filtered = filtered.filter(service => 
        parseFloat(service.rate) <= criteria.maxRate
      );
    }

    if (criteria.refill !== undefined) {
      filtered = filtered.filter(service => 
        service.refill === criteria.refill
      );
    }

    if (criteria.cancel !== undefined) {
      filtered = filtered.filter(service => 
        service.cancel === criteria.cancel
      );
    }

    return filtered;
  }

  // Calculate order cost
  calculateOrderCost(service, quantity) {
    const rate = parseFloat(service.rate);
    const adminProfit = parseFloat(service.adminProfit || 0);
    // السعر النهائي = (سعر المزود + هامش ربح الأدمن) لكل 1000 وحدة
    return ((rate + adminProfit) * quantity) / 1000;
  }

  // Validate order parameters
  validateOrderParams(service, quantity, link) {
    const errors = [];

    if (!service) {
      errors.push('Service is required');
    }

    if (!quantity || quantity < 1) {
      errors.push('Quantity must be greater than 0');
    }

    if (service && quantity) {
      if (quantity < parseInt(service.min)) {
        errors.push(`Minimum quantity is ${service.min}`);
      }
      
      if (quantity > parseInt(service.max)) {
        errors.push(`Maximum quantity is ${service.max}`);
      }
    }

    if (!link || !this.isValidUrl(link)) {
      errors.push('Valid URL is required');
    }

    return errors;
  }

  // Validate URL
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

module.exports = SMMService;

