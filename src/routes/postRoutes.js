const router = require('express').Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createPost,
  getFeed,
  getPost,
  getMyPosts,
  updatePost,
  deletePost,
} = require('../controllers/postController');
const { likePost, unlikePost } = require('../controllers/likeController');
const { addComment, getComments, deleteComment } = require('../controllers/commentController');
const { reportPost } = require('../controllers/reportController');

router.get('/', protect, getFeed);
router.get('/mine', protect, getMyPosts);
router.get('/:id', protect, getPost);
router.post('/', protect, upload.single('media'), createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

router.post('/:id/like', protect, likePost);
router.delete('/:id/like', protect, unlikePost);

router.post('/:id/comments', protect, addComment);
router.get('/:id/comments', protect, getComments);
router.delete('/:id/comments/:commentId', protect, deleteComment);

router.post('/:id/report', protect, reportPost);

module.exports = router;
