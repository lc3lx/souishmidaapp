const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    price: { type: Number, required: true }, // السعر الشهري أو السنوي
    duration: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }], // الخدمات المشمولة
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Package = mongoose.model("Package", packageSchema);
module.exports = Package;
