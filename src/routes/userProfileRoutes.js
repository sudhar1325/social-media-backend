const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getUserProfile } = require('../controllers/userProfileController');

router.get('/:id', protect, getUserProfile);

module.exports = router;