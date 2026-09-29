const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Get or create conversation, then fetch messages
exports.getDirectMessages = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      throw new ApiError(400, 'Không thể tự nhắn tin cho chính mình');
    }

    // Find if a conversation exists between these two users
    const conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: targetUserId } } }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, fullName: true, avatarUrl: true } },
            parent: { include: { sender: { select: { id: true, fullName: true } } } }
          }
        }
      }
    });

    if (!conversation) {
      // Create new conversation
      const newConv = await prisma.conversation.create({
        data: {
          participants: {
            create: [
              { userId: currentUserId },
              { userId: targetUserId }
            ]
          }
        },
        include: { messages: true }
      });
      return ApiResponse.success(res, 'Thành công', { messages: [], conversationId: newConv.id });
    }

    return ApiResponse.success(res, 'Thành công', { messages: conversation.messages, conversationId: conversation.id });
  } catch (error) {
    next(error);
  }
};

exports.sendDirectMessage = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;
    const { content, parentId } = req.body;

    // Upload file if present
    let fileUrl = null;
    let fileName = null;
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'toeic-hub/dm-files', resource_type: 'auto' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      fileUrl = uploadResult.secure_url;
      fileName = req.file.originalname;
    }

    if (!content && !fileUrl) {
      throw new ApiError(400, 'Tin nhắn không được để trống');
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: targetUserId } } }
        ]
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            create: [
              { userId: currentUserId },
              { userId: targetUserId }
            ]
          }
        }
      });
    }

    const message = await prisma.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: currentUserId,
        content: content || '',
        fileUrl,
        fileName,
        parentId: parentId || null
      },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
        parent: { include: { sender: { select: { id: true, fullName: true } } } }
      }
    });

    // Emit socket event
    const io = require('../socket').getIO();
    io.to(targetUserId).emit('new_direct_message', message);
    // Emit to sender as well if multiple devices
    io.to(currentUserId).emit('new_direct_message', message);

    return ApiResponse.success(res, 'Gửi tin nhắn thành công', message);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;

    const conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: targetUserId } } }
        ]
      }
    });

    if (conversation) {
      await prisma.directMessage.updateMany({
        where: {
          conversationId: conversation.id,
          senderId: targetUserId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });

      const io = require('../socket').getIO();
      if (io) {
        // Emit to target user that their messages were read
        io.to(targetUserId).emit('messages_read', { conversationId: conversation.id, readerId: req.user.id });
        // Emit to the reader themselves so their global components (like FloatingChatButton) can update their unread count
        io.to(req.user.id).emit('messages_read', { conversationId: conversation.id, readerId: req.user.id });
      }
    }

    return ApiResponse.success(res, 'Đã xem tin nhắn');
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Count all direct messages where this user is a participant, but NOT the sender, and isRead is false
    const directCount = await prisma.directMessage.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          participants: {
            some: { userId: userId }
          }
        }
      }
    });

    // Group Messages Unread Count
    let groupCount = 0;
    const userGroups = await prisma.groupMember.findMany({
      where: { userId }
    });

    for (const group of userGroups) {
      const gCount = await prisma.groupMessage.count({
        where: {
          groupId: group.groupId,
          userId: { not: userId },
          createdAt: { gt: group.lastReadAt }
        }
      });
      groupCount += gCount;
    }

    return ApiResponse.success(res, 'Unread count', { count: directCount + groupCount });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const unreadMessages = await prisma.directMessage.groupBy({
      by: ['senderId'],
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          participants: {
            some: { userId: userId }
          }
        }
      },
      _count: {
        id: true
      }
    });

    const details = {};
    unreadMessages.forEach(item => {
      details[item.senderId] = item._count.id;
    });

    // Group Messages Unread Count
    const userGroups = await prisma.groupMember.findMany({
      where: { userId }
    });

    for (const group of userGroups) {
      const count = await prisma.groupMessage.count({
        where: {
          groupId: group.groupId,
          userId: { not: userId }, // do not count my own messages
          createdAt: {
            gt: group.lastReadAt
          }
        }
      });
      if (count > 0) {
        details[group.groupId] = count;
      }
    }

    return ApiResponse.success(res, 'Unread details', { details });
  } catch (error) {
    next(error);
  }
};

exports.getRecentInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const recentInfo = {}; // { [friendId or groupId]: { content, isSenderMe } }

    // Direct Messages
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId } }
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, senderId: true, isDeleted: true, fileUrl: true }
        }
      }
    });

    conversations.forEach(conv => {
      const otherParticipant = conv.participants.find(p => p.userId !== userId);
      if (otherParticipant && conv.messages.length > 0) {
        const msg = conv.messages[0];
        let content = msg.isDeleted ? 'Tin nhắn đã bị thu hồi' : (msg.content || 'Đính kèm tệp');
        try {
          const parsed = JSON.parse(content);
          if (parsed.type === 'SHARED_POST') content = 'Đã chia sẻ bài viết';
          if (parsed.type === 'SHARED_TIP') content = 'Đã chia sẻ Tip';
        } catch(e) {}
        
        recentInfo[otherParticipant.userId] = {
          content,
          isSenderMe: msg.senderId === userId
        };
      }
    });

    // Group Messages
    const groups = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { content: true, userId: true, isDeleted: true, fileUrl: true }
            }
          }
        }
      }
    });

    groups.forEach(g => {
      if (g.group.messages.length > 0) {
        const msg = g.group.messages[0];
        let content = msg.isDeleted ? 'Tin nhắn đã bị thu hồi' : (msg.content || 'Đính kèm tệp');
        try {
          const parsed = JSON.parse(content);
          if (parsed.type === 'SHARED_POST') content = 'Đã chia sẻ bài viết';
          if (parsed.type === 'SHARED_TIP') content = 'Đã chia sẻ Tip';
        } catch(e) {}
        
        recentInfo[g.groupId] = {
          content,
          isSenderMe: msg.userId === userId
        };
      }
    });

    return ApiResponse.success(res, 'Recent info', recentInfo);
  } catch (error) {
    next(error);
  }
};

exports.pinDirectMessage = async (req, res, next) => {
  try {
    const { msgId } = req.params;
    const { pinType } = req.body;
    const userId = req.user.id;

    const msg = await prisma.directMessage.findUnique({
      where: { id: msgId },
      include: { conversation: { include: { participants: true } } }
    });

    if (!msg) throw new ApiError(404, 'Không tìm thấy tin nhắn');

    const isParticipant = msg.conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) throw new ApiError(403, 'Bạn không thuộc cuộc trò chuyện này');

    const updated = await prisma.directMessage.update({
      where: { id: msgId },
      data: { isPinned: true, pinType: pinType || 'GENERAL' },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
        parent: { include: { sender: { select: { id: true, fullName: true } } } }
      }
    });

    return ApiResponse.success(res, 'Đã ghim tin nhắn', updated);
  } catch (error) {
    next(error);
  }
};

exports.unpinDirectMessage = async (req, res, next) => {
  try {
    const { msgId } = req.params;
    const userId = req.user.id;

    const msg = await prisma.directMessage.findUnique({
      where: { id: msgId },
      include: { conversation: { include: { participants: true } } }
    });

    if (!msg) throw new ApiError(404, 'Không tìm thấy tin nhắn');

    const isParticipant = msg.conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) throw new ApiError(403, 'Bạn không thuộc cuộc trò chuyện này');

    const updated = await prisma.directMessage.update({
      where: { id: msgId },
      data: { isPinned: false, pinType: null },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
        parent: { include: { sender: { select: { id: true, fullName: true } } } }
      }
    });

    return ApiResponse.success(res, 'Đã bỏ ghim tin nhắn', updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteDirectMessage = async (req, res, next) => {
  try {
    const { msgId } = req.params;
    const userId = req.user.id;

    const msg = await prisma.directMessage.findUnique({
      where: { id: msgId }
    });

    if (!msg) throw new ApiError(404, 'Không tìm thấy tin nhắn');
    if (msg.senderId !== userId) throw new ApiError(403, 'Bạn chỉ có thể thu hồi tin nhắn của chính mình');

    const updated = await prisma.directMessage.update({
      where: { id: msgId },
      data: { isDeleted: true, content: '', fileUrl: null, fileName: null },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } }
      }
    });

    const io = require('../socket').getIO();
    if (io) {
      // Find conversation to emit to both users
      const msgWithConv = await prisma.directMessage.findUnique({
        where: { id: msgId },
        include: { conversation: { include: { participants: true } } }
      });
      if (msgWithConv) {
        msgWithConv.conversation.participants.forEach(p => {
          io.to(p.userId).emit('message_deleted', updated);
        });
      }
    }

    return ApiResponse.success(res, 'Đã thu hồi tin nhắn', updated);
  } catch (error) {
    next(error);
  }
};
