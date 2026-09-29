const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// User tạo report
exports.createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason } = req.body;
    const reporterId = req.user.id;

    if (!targetType || !targetId || !reason) {
      throw new ApiError(400, 'Vui lòng cung cấp đầy đủ thông tin báo cáo');
    }

    const report = await prisma.report.create({
      data: {
        targetType,
        targetId,
        reason,
        reporterId
      },
      include: {
        reporter: { select: { id: true, fullName: true } }
      }
    });

    return ApiResponse.created(res, 'Báo cáo đã được gửi', report);
  } catch (error) {
    next(error);
  }
};

// Admin xem danh sách report (PENDING)
exports.getReports = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Bạn không có quyền truy cập');
    }

    const reports = await prisma.report.findMany({
      where: { status: 'PENDING' },
      include: {
        reporter: { select: { id: true, fullName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return ApiResponse.success(res, 'Fetched reports', reports);
  } catch (error) {
    next(error);
  }
};

// Admin xử lý report
exports.updateReport = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Bạn không có quyền truy cập');
    }

    const { id } = req.params;
    const { status } = req.body;

    const report = await prisma.report.update({
      where: { id },
      data: { status }
    });

    return ApiResponse.success(res, 'Report updated', report);
  } catch (error) {
    next(error);
  }
};
