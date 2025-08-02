const Message = require('../models/messageModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const SocialMediaService = require('../services/socialMediaService');

// @desc    Send direct message with product details
// @route   POST /api/v1/messages/send-product
// @access  Private
exports.sendProductMessage = catchAsync(async (req, res, next) => {
  const { platform, recipientId, productId, message } = req.body;
  
  // 1) Get product details
  const product = await Product.findOne({ _id: productId, user: req.user.id });
  if (!product) {
    return next(new AppError('المنتج غير موجود أو لا تملك صلاحية الوصول إليه', 404));
  }
  
  // 2) Create message content with product details
  const messageContent = `${message}\n\n` +
    `🛍️ ${product.name}\n` +
    `💰 السعر: $${product.price}\n` +
    `📝 ${product.description || 'لا يوجد وصف'}\n`;
  
  // 3) Send message via social media
  const socialMediaService = new SocialMediaService(req.user);
  let platformMessageId;
  
  try {
    const result = await socialMediaService.sendDirectMessage(
      platform,
      recipientId,
      messageContent,
      product.images[0] // Send first product image if available
    );
    
    platformMessageId = result.id;
  } catch (error) {
    console.error('Error sending message:', error);
    return next(new AppError('فشل في إرسال الرسالة: ' + error.message, 500));
  }
  
  // 4) Save message to database
  const savedMessage = await Message.create({
    user: req.user.id,
    platform,
    recipientId,
    recipientName: req.body.recipientName,
    content: messageContent,
    product: productId,
    platformMessageId,
    direction: 'outgoing',
    status: 'sent'
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      message: savedMessage
    }
  });
});

// @desc    Get all conversations
// @route   GET /api/v1/messages/conversations
// @access  Private
exports.getConversations = catchAsync(async (req, res, next) => {
  // Group messages by thread/recipient
  const conversations = await Message.aggregate([
    {
      $match: {
        user: req.user._id,
        $or: [
          { direction: 'incoming' },
          { direction: 'outgoing' }
        ]
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          platform: '$platform',
          threadId: '$threadId',
          recipientId: '$recipientId',
          recipientName: '$recipientName'
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [{ $eq: ['$isRead', false] }, 1, 0]
          }
        },
        totalMessages: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        platform: '$_id.platform',
        threadId: '$_id.threadId',
        recipientId: '$_id.recipientId',
        recipientName: '$_id.recipientName',
        lastMessage: 1,
        unreadCount: 1,
        totalMessages: 1
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);
  
  res.status(200).json({
    status: 'success',
    results: conversations.length,
    data: {
      conversations
    }
  });
});

// @desc    Get messages in a conversation
// @route   GET /api/v1/messages/conversation/:platform/:threadId
// @access  Private
exports.getConversation = catchAsync(async (req, res, next) => {
  const { platform, threadId } = req.params;
  
  const messages = await Message.find({
    user: req.user._id,
    platform,
    threadId
  })
  .sort('createdAt')
  .populate('product', 'name price images');
  
  // Mark messages as read
  await Message.updateMany(
    {
      user: req.user._id,
      platform,
      threadId,
      direction: 'incoming',
      isRead: false
    },
    { $set: { isRead: true, readAt: Date.now() } }
  );
  
  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages
    }
  });
});

// @desc    Sync messages from social media platforms
// @route   POST /api/v1/messages/sync/:platform
// @access  Private
exports.syncMessages = catchAsync(async (req, res, next) => {
  const { platform } = req.params;
  
  const socialMediaService = new SocialMediaService(req.user);
  const syncResult = await socialMediaService.syncMessages(platform);
  
  res.status(200).json({
    status: 'success',
    data: {
      synced: syncResult.length,
      result: syncResult
    }
  });
});
