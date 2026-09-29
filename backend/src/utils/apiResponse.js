/**
 * Standard API Response Wrapper
 */
class ApiResponse {
  static success(res, message = 'Success', data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res, message = 'Created successfully', data = null) {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }
}

module.exports = ApiResponse;
