const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username or email already in use' });
    }
    const hashed = await bcrypt.hash(password, 10);

    // New accounts start as 'pending' and require admin approval before
    // they can log in. No token is issued here on purpose.
    const user = await User.create({
      username,
      email,
      password: hashed,
      accountStatus: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Account created. An administrator needs to approve it before you can log in.',
      user: { id: user._id, username: user.username, email: user.email, accountStatus: user.accountStatus },
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (user.accountStatus === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is awaiting admin approval. Please check back later.',
      });
    }
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { _id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = { register, login, getMe };
