const User = require('../models/User');
const Post = require('../models/Post');

const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const posts = await Post.find({ userId: req.params.id, status: 'approved' })
      .sort({ createdAt: -1 });

    res.json({ success: true, user, posts });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUserProfile };