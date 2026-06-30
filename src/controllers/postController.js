const Post = require('../models/Post');

const createPost = async (req, res, next) => {
  try {
    const { description, category } = req.body;
    let mediaType = 'text';
    let mediaURL = '';

    if (req.file) {
      mediaURL = `/uploads/${req.file.filename}`;
      mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    }

    if (!description && !mediaURL) {
      return res.status(400).json({ success: false, message: 'Post must have text or media' });
    }

    const post = await Post.create({
      userId: req.user._id,
      description: description || '',
      mediaType,
      mediaURL,
      category: category || 'general',
      status: 'pending',
    });

    res.status(201).json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

// Public feed: only approved posts
const getFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await Post.find({ status: 'approved' })
      .populate('userId', 'username profileImage')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Post.countDocuments({ status: 'approved' });

    res.json({ success: true, posts, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('userId', 'username profileImage');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

// Posts belonging to logged-in user (any status)
const getMyPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your post' });
    }
    post.description = req.body.description ?? post.description;
    post.category = req.body.category ?? post.category;
    // Editing resets status to pending for re-moderation
    post.status = 'pending';
    post.rejectionReason = '';
    await post.save();
    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPost, getFeed, getPost, getMyPosts, updatePost, deletePost };
