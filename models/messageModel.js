const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { 
    type: String, 
    enum: ['facebook', 'instagram', 'tiktok', 'x'], 
    required: true 
  },
  threadId: { type: String, required: true },
  recipientId: { type: String, required: true },
  recipientName: String,
  recipientImage: String,
  content: { type: String, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  status: { 
    type: String, 
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'], 
    default: 'sending' 
  },
  direction: { 
    type: String, 
    enum: ['incoming', 'outgoing'], 
    required: true 
  },
  platformMessageId: String,
  error: String,
  metadata: mongoose.Schema.Types.Mixed
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
messageSchema.index({ user: 1, platform: 1, threadId: 1, createdAt: -1 });
messageSchema.index({ platformMessageId: 1, platform: 1 }, { unique: true, sparse: true });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
