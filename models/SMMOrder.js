const mongoose = require('mongoose');

const smmOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  externalOrderId: {
    type: String,
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SMMProvider',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
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
    }
  },
  link: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  charge: {
    type: Number,
    required: true,
    min: 0
  },
  startCount: {
    type: Number,
    default: 0
  },
  remains: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'In progress', 'Completed', 'Partial', 'Processing', 'Canceled'],
    default: 'Pending'
  },
  currency: {
    type: String,
    default: 'USD'
  },
  customComments: [{
    type: String,
    trim: true
  }],
  refillId: {
    type: String,
    default: null
  },
  cancelId: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    trim: true
  },
  metadata: {
    platform: {
      type: String,
      enum: ['facebook', 'instagram', 'x', 'tiktok', 'youtube', 'other']
    },
    postType: {
      type: String,
      enum: ['post', 'story', 'reel', 'video', 'other']
    },
    targetAudience: {
      type: String,
      trim: true
    }
  },
  timeline: {
    orderedAt: {
      type: Date,
      default: Date.now
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    canceledAt: {
      type: Date,
      default: null
    }
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
smmOrderSchema.index({ orderId: 1 });
smmOrderSchema.index({ externalOrderId: 1 });
smmOrderSchema.index({ provider: 1 });
smmOrderSchema.index({ user: 1 });
smmOrderSchema.index({ status: 1 });
smmOrderSchema.index({ createdAt: -1 });

// Pre-save middleware
smmOrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Update timeline based on status
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'In progress':
      case 'Processing':
        if (!this.timeline.startedAt) {
          this.timeline.startedAt = now;
        }
        break;
      case 'Completed':
        if (!this.timeline.completedAt) {
          this.timeline.completedAt = now;
        }
        break;
      case 'Canceled':
        if (!this.timeline.canceledAt) {
          this.timeline.canceledAt = now;
        }
        break;
    }
  }
  
  next();
});

// Virtual for completion percentage
smmOrderSchema.virtual('completionPercentage').get(function() {
  if (this.quantity === 0) return 0;
  const delivered = this.quantity - this.remains;
  return Math.round((delivered / this.quantity) * 100);
});

// Virtual for duration
smmOrderSchema.virtual('duration').get(function() {
  if (!this.timeline.startedAt) return null;
  
  const endTime = this.timeline.completedAt || this.timeline.canceledAt || new Date();
  return endTime.getTime() - this.timeline.startedAt.getTime();
});

// Methods
smmOrderSchema.methods.updateStatus = function(newStatus, additionalData = {}) {
  this.status = newStatus;
  
  if (additionalData.startCount !== undefined) {
    this.startCount = additionalData.startCount;
  }
  
  if (additionalData.remains !== undefined) {
    this.remains = additionalData.remains;
  }
  
  return this.save();
};

smmOrderSchema.methods.canRefill = function() {
  return this.status === 'Completed' && this.service.refill;
};

smmOrderSchema.methods.canCancel = function() {
  return ['Pending', 'In progress', 'Processing'].includes(this.status) && this.service.cancel;
};

// Static methods
smmOrderSchema.statics.getByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

smmOrderSchema.statics.getByUser = function(userId) {
  return this.find({ user: userId }).sort({ createdAt: -1 });
};

smmOrderSchema.statics.getByProvider = function(providerId) {
  return this.find({ provider: providerId }).sort({ createdAt: -1 });
};

smmOrderSchema.statics.generateOrderId = function() {
  return 'SMM' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
};

module.exports = mongoose.model('SMMOrder', smmOrderSchema);

