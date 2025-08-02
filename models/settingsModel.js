const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  referralPercent: {
    type: Number,
    default: 10, // النسبة الافتراضية 10%
    min: 0,
    max: 100,
  },
  // يمكن إضافة إعدادات أخرى لاحقاً
});

module.exports = mongoose.model("Settings", settingsSchema);
