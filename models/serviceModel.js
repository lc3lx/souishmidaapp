const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "اسم الخدمة مطلوب"], unique: true },
    description: String,
    price: { type: Number, required: [true, "سعر الخدمة مطلوب"] },
    platforms: [
      {
        type: String,
        enum: ["facebook", "instagram", "tiktok", "threads"],
        required: [true, "يجب تحديد منصة واحدة على الأقل"],
      },
    ],
    isActive: { type: Boolean, default: true },
    features: [String],
  },
  {
    timestamps: true,
  }
);

// تحديث updatedAt قبل الحفظ
serviceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Service = mongoose.model("Service", serviceSchema);
module.exports = Service;
