const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, default: '' },
    mediaType: { type: String, enum: ['image', 'video', 'mixed', 'text'], default: 'text' },
    mediaURL: { type: String, default: '' },
    mediaFiles: [
      {
        url: { type: String },
        type: { type: String, enum: ['image', 'video'] },
      },
    ],
    category: { type: String, default: 'general' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ userId: 1 });

module.exports = mongoose.model('Post', postSchema);