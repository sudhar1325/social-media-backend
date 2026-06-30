const Comment = require('../models/Comment');
const Post = require('../models/Post');

const addComment = async (req, res, next) => {
  try {
    const { comment, parentComment } = req.body;
    if (!comment) return res.status(400).json({ success: false, message: 'Comment text required' });

    const newComment = await Comment.create({
      postId: req.params.id,
      userId: req.user._id,
      comment,
      parentComment: parentComment || null,
    });
    await Post.findByIdAndUpdate(req.params.id, { $inc: { commentCount: 1 } });

    const populated = await newComment.populate('userId', 'username profileImage');
    res.status(201).json({ success: true, comment: populated });
  } catch (err) {
    next(err);
  }
};

const getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ postId: req.params.id })
      .populate('userId', 'username profileImage')
      .sort({ createdAt: 1 });
    res.json({ success: true, comments });
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await comment.deleteOne();
    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { addComment, getComments, deleteComment };
