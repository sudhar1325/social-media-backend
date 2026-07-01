const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  dashboardStats,
  getPendingPosts,
  approvePost,
  rejectPost,
  getUsers,
  getPendingUsers,
  approveUser,
  setUserStatus,
  updateUser,
  deleteUser,
  createUser,
  getReports,
  resolveReport,
} = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get('/dashboard', dashboardStats);
router.get('/posts/pending', getPendingPosts);
router.put('/posts/:id/approve', approvePost);
router.put('/posts/:id/reject', rejectPost);
router.get('/users', getUsers);
router.get('/users/pending', getPendingUsers);
router.post('/users', createUser);
router.put('/users/:id/approve', approveUser);
router.put('/users/:id/status', setUserStatus);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/reports', getReports);
router.put('/reports/:id', resolveReport);

module.exports = router;