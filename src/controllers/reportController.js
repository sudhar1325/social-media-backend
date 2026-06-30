const Report = require('../models/Report');

const reportPost = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason required' });
    const report = await Report.create({
      postId: req.params.id,
      reportedBy: req.user._id,
      reason,
    });
    res.status(201).json({ success: true, report });
  } catch (err) {
    next(err);
  }
};

module.exports = { reportPost };
