const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'معرف المستخدم مطلوب'] 
  },
  service: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Service', 
    required: [true, 'معرف الخدمة مطلوب'] 
  },
  startDate: { 
    type: Date, 
    default: Date.now 
  },
  endDate: {
    type: Date,
    required: [true, 'تاريخ انتهاء الاشتراك مطلوب']
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  autoRenew: { 
    type: Boolean, 
    default: false 
  },
  paymentDetails: {
    amount: Number,
    paymentMethod: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
subscriptionSchema.index({ user: 1, service: 1, isActive: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
