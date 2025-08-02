const express = require("express");
const { protect, allowedTo } = require("../controllers/auth.Controller");
const referralController = require("../controllers/referralController");

const router = express.Router();

// حماية كل المسارات
router.use(protect);

// المستخدم: إنشاء إحالة وجلب إحالاته
router.post("/", referralController.createReferral);
router.get("/my-referrals", referralController.getMyReferrals);

// الأدمن: إدارة كل الإحالات وتعديلها
router.get("/admin", allowedTo("admin"), referralController.adminGetAllReferrals);
router.patch("/admin/:id/reward", allowedTo("admin"), referralController.adminUpdateReferralReward);
router.patch("/admin/:id/status", allowedTo("admin"), referralController.adminUpdateReferralStatus);

module.exports = router;
