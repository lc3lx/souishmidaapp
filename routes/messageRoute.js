const express = require('express');
const messageController = require('../controllers/messageController');
const { protect } = require('../controllers/auth.Controller');

const { requireActiveSubscription, requirePackageService } = require("../middleware/subscriptionMiddleware");
const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Message routes
router.post('/send-product', requireActiveSubscription, requirePackageService('facebook'), messageController.sendProductMessage);
router.get('/conversations', messageController.getConversations);
router.get('/conversation/:platform/:threadId', messageController.getConversation);
router.post('/sync/:platform', messageController.syncMessages);

module.exports = router;
