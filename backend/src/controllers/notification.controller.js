const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true }
        }
      }
    });
    return ApiResponse.success(res, 'Success', notifications);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    return ApiResponse.success(res, 'Marked all as read');
  } catch (error) {
    next(error);
  }
};
