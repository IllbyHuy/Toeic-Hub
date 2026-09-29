const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

exports.getFriendshipStatus = async (req, res, next) => {
  try {
    const userId1 = req.user.id;
    const userId2 = req.params.userId;

    if (userId1 === userId2) return ApiResponse.success(res, 'Thành công', { status: 'SELF' });

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 }
        ]
      }
    });

    if (!friendship) return ApiResponse.success(res, 'Thành công', { status: 'NONE' });

    if (friendship.status === 'PENDING') {
      if (friendship.senderId === userId1) return ApiResponse.success(res, 'Thành công', { status: 'SENT' });
      return ApiResponse.success(res, 'Thành công', { status: 'RECEIVED' });
    }

    return ApiResponse.success(res, 'Thành công', { status: friendship.status }); // ACCEPTED or REJECTED
  } catch (error) {
    next(error);
  }
};

exports.sendFriendRequest = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;

    if (senderId === receiverId) throw new ApiError(400, 'Không thể kết bạn với chính mình');

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') throw new ApiError(400, 'Đã là bạn bè');
      if (existing.status === 'PENDING') throw new ApiError(400, 'Đã gửi lời mời kết bạn');
      
      // If rejected before, maybe allow re-send? We can update it.
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'PENDING', senderId, receiverId } // reset sender just in case it was reversed
      });
      return ApiResponse.success(res, 'Đã gửi lại lời mời kết bạn', null);
    }

    const friendship = await prisma.friendship.create({
      data: { senderId, receiverId, status: 'PENDING' }
    });

    // Tạo notification
    await prisma.notification.create({
      data: {
        userId: receiverId,
        senderId: senderId,
        content: `${req.user.fullName} đã gửi cho bạn lời mời kết bạn.`,
        type: 'FRIEND_REQUEST',
      }
    });
    
    const io = require('../socket').getIO();
    const senderUser = await prisma.user.findUnique({ where: { id: senderId }, select: { id: true, fullName: true, avatarUrl: true } });
    io.to(receiverId).emit('new_notification', { type: 'FRIEND_REQUEST', senderId, content: `${req.user.fullName} đã gửi cho bạn lời mời kết bạn.`, sender: senderUser });

    return ApiResponse.success(res, 'Đã gửi lời mời kết bạn', friendship);
  } catch (error) {
    next(error);
  }
};

exports.acceptFriendRequest = async (req, res, next) => {
  try {
    const receiverId = req.user.id;
    const senderId = req.params.userId;

    const friendship = await prisma.friendship.findFirst({
      where: { senderId, receiverId, status: 'PENDING' }
    });

    if (!friendship) throw new ApiError(404, 'Không tìm thấy lời mời kết bạn');

    await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'ACCEPTED' }
    });

    await prisma.notification.create({
      data: {
        userId: senderId,
        senderId: receiverId,
        content: `Hai bạn giờ đã là bạn bè.`,
        type: 'FRIEND_ACCEPT',
      }
    });
    const io = require('../socket').getIO();
    const receiverUser = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true, fullName: true, avatarUrl: true } });
    io.to(senderId).emit('new_notification', { type: 'FRIEND_ACCEPT', senderId: receiverId, content: `${req.user.fullName} đã chấp nhận lời mời kết bạn.`, sender: receiverUser });

    return ApiResponse.success(res, 'Đã chấp nhận kết bạn', null);
  } catch (error) {
    next(error);
  }
};

exports.rejectFriendRequest = async (req, res, next) => {
  try {
    const receiverId = req.user.id;
    const senderId = req.params.userId;

    const friendship = await prisma.friendship.findFirst({
      where: { senderId, receiverId, status: 'PENDING' }
    });

    if (!friendship) throw new ApiError(404, 'Không tìm thấy lời mời kết bạn');

    await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'REJECTED' }
    });

    return ApiResponse.success(res, 'Đã từ chối kết bạn', null);
  } catch (error) {
    next(error);
  }
};

exports.unfriend = async (req, res, next) => {
  try {
    const userId1 = req.user.id;
    const userId2 = req.params.userId;

    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 }
        ]
      }
    });

    return ApiResponse.success(res, 'Đã hủy kết bạn', null);
  } catch (error) {
    next(error);
  }
};

exports.getFriends = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: 'ACCEPTED'
      },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
        receiver: { select: { id: true, fullName: true, avatarUrl: true } }
      }
    });

    const friends = friendships.map(f => f.senderId === userId ? f.receiver : f.sender);
    return ApiResponse.success(res, 'Thành công', friends);
  } catch (error) {
    next(error);
  }
};

exports.getFriendRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const requests = await prisma.friendship.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } }
    });
    return ApiResponse.success(res, 'Thành công', requests);
  } catch (error) {
    next(error);
  }
};
