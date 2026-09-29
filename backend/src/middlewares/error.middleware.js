const ApiError = require('../utils/apiError');

/**
 * Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const field = err.meta?.target ? err.meta.target.join(', ') : 'field';
    error = new ApiError(400, `Duplicate value for unique constraint: ${field}`);
  }

  // Handle Prisma record not found (P2025)
  if (err.code === 'P2025') {
    error = new ApiError(404, 'Record not found');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid token. Please log in again.');
  }
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Your token has expired. Please log in again.');
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
