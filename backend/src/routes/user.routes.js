const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.put('/profile', authenticate, upload.single('avatar'), userController.updateProfile);
router.put('/change-password', authenticate, userController.changePassword);
router.get('/leaderboard', authenticate, userController.getLeaderboard);
router.get('/me/analytics', authenticate, userController.getAnalytics);
router.get('/me/analytics/activity-details', authenticate, userController.getActivityDetails);
router.post('/nudge', authenticate, userController.nudgeUser);
router.get('/top-contributors', userController.getTopContributors);
router.get('/:id', userController.getUserProfile);

module.exports = router;
