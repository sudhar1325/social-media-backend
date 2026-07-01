const User = require('../models/User');

const profileDetails = async (req, res) => {
  res.json({ success: true, user: req.user });
};

const updateProfile = async (req, res, next) => {
  try {
    const { bio } = req.body;
    const update = {};
    if (bio !== undefined) update.bio = bio;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select(
      '-password'
    );
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    const profileImage = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage },
      { new: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = { profileDetails, updateProfile, uploadAvatar };