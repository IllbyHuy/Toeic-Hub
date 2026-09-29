const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const passport = require('passport');
require('../config/passport'); // Initialize strategies
const { registerSchema, loginSchema } = require('../validators/auth.validator');

// Cấu hình chống Spam: Tối đa 5 request đăng ký/đăng nhập mỗi 15 phút từ 1 IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Tăng lên 100 cho dễ dev
  message: { success: false, message: 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau 15 phút.' }
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authenticate, authController.getMe);

// OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login` }), authController.oauthCallback);

router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login` }), authController.oauthCallback);

module.exports = router;
