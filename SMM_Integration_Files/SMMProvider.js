const mongoose = require('mongoose');

const smmProviderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  apiUrl: {
    type: String,
    required: true,
    trim: true
  },
  apiKey: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  supportedServices: [{
    serviceId: {
      type: String,
      required: true
    },
    serviceName: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    rate: {
      type: Number,
      required: true
    },
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    },
    refill: {
      type: Boolean,
      default: false
    },
    cancel: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  lastSyncAt: {
    type: Date,
    default: Date.now
  },
  stats: {
    totalOrders: {
      type: Number,
      default: 0
    },
    successfulOrders: {
      type: Number,
      default: 0
    },
    failedOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    }
  },
  settings: {
    timeout: {
      type: Number,
      default: 30000
    },
    retryAttempts: {
      type: Number,
      default: 3
    },
    retryDelay: {
      type: Number,
      default: 1000
    },
    autoSync: {
      type: Boolean,
      default: true
    },
    syncInterval: {
      type: Number,
      default: 3600000
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
smmProviderSchema.index({ name: 1 });
smmProviderSchema.index({ isActive: 1 });
smmProviderSchema.index({ priority: 1 });
smmProviderSchema.index({ createdBy: 1 });

// Pre-save middleware
smmProviderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for success rate
smmProviderSchema.virtual('successRate').get(function() {
  if (this.stats.totalOrders === 0) return 0;
  return (this.stats.successfulOrders / this.stats.totalOrders) * 100;
});

// Methods
smmProviderSchema.methods.updateStats = function(orderSuccess, amount, responseTime) {
  this.stats.totalOrders += 1;
  if (orderSuccess) {
    this.stats.successfulOrders += 1;
  } else {
    this.stats.failedOrders += 1;
  }
  this.stats.totalSpent += amount || 0;
  
  const totalResponseTime = this.stats.averageResponseTime * (this.stats.totalOrders - 1) + responseTime;
  this.stats.averageResponseTime = totalResponseTime / this.stats.totalOrders;
  
  return this.save();
};

smmProviderSchema.methods.syncServices = async function() {
  this.lastSyncAt = Date.now();
  return this.save();
};

// Static methods
smmProviderSchema.statics.getActiveProviders = function() {
  return this.find({ isActive: true }).sort({ priority: 1 });
};

smmProviderSchema.statics.getByName = function(name) {
  return this.findOne({ name: name.toLowerCase() });
};

module.exports = mongoose.model('SMMProvider', smmProviderSchema);

