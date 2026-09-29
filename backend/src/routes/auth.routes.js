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
const getRedirectClientUrl = () => {
  if (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost')) {
    return process.env.CLIENT_URL.replace(/\/$/, '');
  }
  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    return 'https://toeic-hub-git-main-illbyhuys-projects.vercel.app';
  }
  return 'http://localhost:5173';
};

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false, failureRedirect: `${getRedirectClientUrl()}/login` })(req, res, next);
}, authController.oauthCallback);

router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false, failureRedirect: `${getRedirectClientUrl()}/login` })(req, res, next);
}, authController.oauthCallback);

module.exports = router;
