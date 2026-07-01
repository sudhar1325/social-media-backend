const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const upload = require('../middleware/upload');
const { profileDetails, updateProfile, uploadAvatar } = require('../controllers/profileController');

router.get('/', protect, profileDetails);
router.put('/', protect, updateProfile);
router.put('/avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;

router.put('/profile', protect, async (req, res, next) => {
  try {
    const { bio, profileImage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { bio, profileImage },
      { new: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

router.put('/change-password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ success: false, message: 'Current password incorrect' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
