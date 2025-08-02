const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'المستخدم مطلوب'] 
  },
  title: { 
    type: String, 
    required: [true, 'عنوان الإشعار مطلوب'],
    trim: true 
  },
  message: { 
    type: String, 
    required: [true, 'نص الإشعار مطلوب'] 
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'promotion', 'system'],
    default: 'info'
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  action: {
    type: {
      type: String,
      enum: ['url', 'route', 'none'],
      default: 'none'
    },
    value: String,
    label: String
  },
  icon: String,
  metadata: mongoose.Schema.Types.Mixed
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
