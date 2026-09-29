const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

/**
 * Middleware authenticate user via JWT Bearer Token
 */
const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError(401, 'Authentication required. No token provided.'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        lastActivityDate: true,
      },
    });

    if (!user) {
      return next(new ApiError(401, 'User belonging to this token no longer exists.'));
    }

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const lastActivityStr = user.lastActivityDate ? new Date(user.lastActivityDate).toLocaleDateString('en-CA') : null;

    if (lastActivityStr !== todayStr) {
      const userController = require('../controllers/user.controller');
      userController.updateUserStreak(user.id).catch(console.error);
    }

    // Attach user to req
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate };
