const ApiError = require('../utils/apiError');

// Middleware chung để nhận vào 1 Zod schema và test req.body (hoặc req.query, req.params)
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    // Nếu Zod báo lỗi, ta format lại lỗi để trả về thông điệp dễ đọc cho Frontend
    const errorMessage = error.errors.map((err) => err.message).join(', ');
    next(new ApiError(400, errorMessage));
  }
};

module.exports = { validate };
