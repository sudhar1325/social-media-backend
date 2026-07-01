const Post = require("../models/Post");
const User = require("../models/User");
const Report = require("../models/Report");

const dashboardStats = async (req, res, next) => {
  try {
    const [pendingPosts, pendingUsers, totalUsers, totalPosts, openReports] =
      await Promise.all([
        Post.countDocuments({ status: "pending" }),
        User.countDocuments({ accountStatus: "pending" }),
        User.countDocuments(),
        Post.countDocuments(),
        Report.countDocuments({ status: "open" }),
      ]);
    res.json({
      success: true,
      stats: {
        pendingPosts,
        pendingUsers,
        totalUsers,
        totalPosts,
        openReports,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getPendingPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ status: "pending" })
      .populate("userId", "username email")
      .sort({ createdAt: 1 });
    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
};

const approvePost = async (req, res, next) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { status: "approved", rejectionReason: "" },
      { new: true },
    );
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const rejectPost = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        rejectionReason: reason || "Did not meet community guidelines",
      },
      { new: true },
    );
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

const getPendingUsers = async (req, res, next) => {
  try {
    const users = await User.find({ accountStatus: "pending" })
      .select("-password")
      .sort({ createdAt: 1 });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

const approveUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus: "active" },
      { new: true },
    ).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const setUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // 'active' | 'suspended'
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus: status },
      { new: true },
    ).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { username, email, role, accountStatus } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, role, accountStatus },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete an admin user' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

const bcrypt = require('bcryptjs');

const createUser = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email and password are required' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username or email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'user',
      accountStatus: 'active',
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ success: true, user: userObj });
  } catch (err) {
    next(err);
  }
};

const getReports = async (req, res, next) => {
  try {
    const reports = await Report.find({
      status: "open",
    })
      .populate({
        path: "postId",
        select: "description mediaType mediaURL",
      })
      .populate({
        path: "reportedBy",
        select: "username",
      })
      .sort({
        createdAt: -1,
      });

    res.json({
      success: true,
      reports,
    });
  } catch (err) {
    next(err);
  }
};

const resolveReport = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["resolved", "dismissed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // resolve = delete post
    if (status === "resolved") {
      await Post.findByIdAndDelete(report.postId);
    }

    report.status = status;
    report.reviewedBy = req.user._id;

    await report.save();

    res.json({
      success: true,
      report,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};