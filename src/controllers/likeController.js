const Like = require('../models/Like');
const Post = require('../models/Post');

const likePost = async (req, res, next) => {
  try {
    const exists = await Like.findOne({ userId: req.user._id, postId: req.params.id });
    if (exists) return res.status(400).json({ success: false, message: 'Already liked' });

    await Like.create({ userId: req.user._id, postId: req.params.id });
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { likeCount: 1 } },
      { new: true }
    );
    res.json({ success: true, likeCount: post.likeCount });
  } catch (err) {
    next(err);
  }
};

const unlikePost = async (req, res, next) => {
  try {
    const existing = await Like.findOneAndDelete({ userId: req.user._id, postId: req.params.id });
    if (!existing) return res.status(400).json({ success: false, message: 'Not liked yet' });

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { likeCount: -1 } },
      { new: true }
    );
    res.json({ success: true, likeCount: post.likeCount });
  } catch (err) {
    next(err);
  }
};

module.exports = { likePost, unlikePost };
