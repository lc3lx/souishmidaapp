const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'اسم العرض مطلوب'],
    trim: true 
  },
  description: String,
  platforms: [{
    type: String,
    enum: ['facebook', 'instagram', 'tiktok', 'x'],
    required: [true, 'يجب تحديد منصة واحدة على الأقل']
  }],
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed'], 
    required: [true, 'نوع الخصم مطلوب'] 
  },
  discountValue: { 
    type: Number, 
    required: [true, 'قيمة الخصم مطلوبة'],
    min: [0, 'قيمة الخصم يجب أن تكون أكبر من أو تساوي الصفر']
  },
  startDate: { 
    type: Date, 
    required: [true, 'تاريخ البداية مطلوب'],
    default: Date.now 
  },
  endDate: { 
    type: Date, 
    required: [true, 'تاريخ النهاية مطلوب'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية'
    }
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  maxUses: { 
    type: Number, 
    min: 0 
  },
  currentUses: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  metadata: mongoose.Schema.Types.Mixed
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
offerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
offerSchema.index({ code: 1 }, { unique: true, sparse: true });

// Pre-save hook to generate code if not provided
offerSchema.pre('save', function(next) {
  if (!this.code) {
    this.code = `OFFER-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }
  next();
});

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;
