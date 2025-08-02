const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  platform: { 
    type: String, 
    enum: ['facebook', 'instagram', 'tiktok', 'x'], 
    required: true 
  },
  platformCommentId: { type: String, required: true },
  postId: { type: String, required: true },
  authorId: String,
  authorName: String,
  authorImage: String,
  content: { type: String, required: true },
  isReplied: { type: Boolean, default: false },
  reply: {
    content: String,
    repliedAt: Date,
    platformReplyId: String,
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    error: String
  },
  metadata: mongoose.Schema.Types.Mixed
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
commentSchema.index({ user: 1, platform: 1, isReplied: 1 });
commentSchema.index({ platformCommentId: 1, platform: 1 }, { unique: true });

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
