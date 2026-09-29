const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, privacy, coverImage } = req.body;
    let { avatar } = req.body;
    const userId = req.user.id;

    if (!name) {
      throw new ApiError(400, 'Group name is required');
    }
    
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'toeic-hub-groups', resource_type: 'image' },
          (error, result) => {
            if (error) return reject(new ApiError(500, 'Lỗi khi upload file lên Cloudinary'));
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      avatar = uploadResult.secure_url;
    }

    const group = await prisma.group.create({
      data: {
        name,
        description,
        privacy: privacy || 'PUBLIC',
        avatar,
        coverImage,
        creatorId: userId,
        members: {
          create: {
            userId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        creator: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        _count: {
          select: { members: true, posts: true },
        },
        members: {
          select: { id: true, userId: true, role: true }
        }
      },
    });

    return ApiResponse.created(res, 'Group created successfully', group);
  } catch (error) {
    next(error);
  }
};

exports.getGroups = async (req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        creator: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        _count: {
          select: { members: true, posts: true },
        },
        members: {
          where: { userId: req.user.id },
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(res, 'Groups fetched successfully', groups);
  } catch (error) {
    next(error);
  }
};

exports.getGroupById = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } }
          },
          orderBy: { role: 'asc' }
        },
        requests: {
          where: { status: 'PENDING' },
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } }
          }
        },
        _count: { select: { members: true, posts: true } }
      }
    });

    if (!group) {
      throw new ApiError(404, 'Không tìm thấy nhóm');
    }

    const isMember = group.members.some(m => m.userId === userId);
    if (group.privacy === 'PRIVATE' && !isMember) {
      throw new ApiError(403, 'Đây là nhóm riêng tư. Bạn cần tham gia để xem nội dung.');
    }

    return ApiResponse.success(res, 'Success', group);
  } catch (error) {
    next(error);
  }
};

exports.getMyGroups = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const members = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });
    const groups = members.map(m => m.group);
    return ApiResponse.success(res, 'My groups fetched successfully', groups);
  } catch (error) {
    next(error);
  }
};
exports.joinGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (existingMember) {
      throw new ApiError(400, 'You are already a member of this group');
    }

    if (group.privacy === 'PRIVATE') {
      const existingRequest = await prisma.groupRequest.findFirst({
        where: { groupId, userId, status: 'PENDING' }
      });
      
      if (existingRequest) {
        throw new ApiError(400, 'Bạn đã gửi yêu cầu tham gia nhóm này rồi.');
      }

      await prisma.groupRequest.create({
        data: { groupId, userId }
      });

      // Send notification to creator
      await prisma.notification.create({
        data: {
          userId: group.creatorId,
          senderId: userId,
          content: `${req.user.fullName} yêu cầu tham gia nhóm ${group.name}`,
          type: 'GROUP_REQUEST',
          postId: groupId // Use postId to store groupId for notifications
        }
      });
      // Try to emit socket to creator
      const io = require('../socket').getIO();
      if (io) {
        io.to(`user_${group.creatorId}`).emit('new_notification', {
          content: `${req.user.fullName} yêu cầu tham gia nhóm ${group.name}`
        });
      }

      return ApiResponse.success(res, 'Đã gửi yêu cầu tham gia nhóm. Vui lòng chờ phê duyệt.');
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role: 'MEMBER',
      },
    });
    
    // System message for join
    await prisma.groupMessage.create({
      data: {
        groupId,
        userId,
        content: `${req.user.fullName} vừa tham gia nhóm`,
        isSystem: true
      }
    });
    
    const io = require('../socket').getIO();
    if (io) {
      io.to(groupId).emit('new_group_message', {
        groupId,
        userId,
        content: `${req.user.fullName} vừa tham gia nhóm`,
        isSystem: true,
        createdAt: new Date()
      });
    }

    return ApiResponse.success(res, 'Joined group successfully', member);
  } catch (error) {
    next(error);
  }
};

exports.updateGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { name, description, privacy, coverImage } = req.body;
    let { avatar } = req.body;
    
    // Check if user is admin
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.user.id } }
    });
    
    if (!member || member.role !== 'ADMIN') {
      throw new ApiError(403, 'Chỉ Admin mới có quyền cập nhật nhóm');
    }
    
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'toeic-hub-groups', resource_type: 'image' },
          (error, result) => {
            if (error) return reject(new ApiError(500, 'Lỗi khi upload file lên Cloudinary'));
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      avatar = uploadResult.secure_url;
    }
    
    const group = await prisma.group.update({
      where: { id: groupId },
      data: { 
        ...(name && { name }), 
        ...(description !== undefined && { description }), 
        ...(privacy && { privacy }), 
        ...(avatar && { avatar }), 
        ...(coverImage && { coverImage }) 
      }
    });
    
    return ApiResponse.success(res, 'Cập nhật thành công', group);
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    
    if (req.user.id !== userId) {
      const adminCheck = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: req.user.id } }
      });
      if (!adminCheck || adminCheck.role !== 'ADMIN') {
        throw new ApiError(403, 'Không có quyền thực hiện hành động này');
      }
    }
    
    const isKickedByAdmin = req.user.id !== userId;

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } }
    });

    if (isKickedByAdmin) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (group) {
        await prisma.notification.create({
          data: {
            userId: userId,
            senderId: req.user.id,
            content: `Bạn đã bị mời ra khỏi nhóm "${group.name}".`,
            type: 'SYSTEM'
          }
        });
        const io = require('../socket').getIO();
        if (io) io.to(userId).emit('new_notification', { type: 'SYSTEM', content: `Bạn đã bị mời ra khỏi nhóm "${group.name}".` });
      }
    }
    
    const count = await prisma.groupMember.count({ where: { groupId } });
    if (count === 0) {
      await prisma.group.delete({ where: { id: groupId } });
      return ApiResponse.success(res, 'Nhóm đã bị xóa vì không còn thành viên', { deleted: true });
    }
    
    return ApiResponse.success(res, 'Thành công', { deleted: false });
  } catch (error) {
    next(error);
  }
};

exports.sendGroupMessage = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user.id;

    if (!content && !req.file) {
      throw new ApiError(400, 'Message content or file is required');
    }

    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });
    if (!isMember) {
      throw new ApiError(403, 'You must join the group to send messages');
    }

    let fileUrl = null;
    let fileName = null;

    if (req.file) {
      const resourceType = req.file.mimetype.startsWith('video/') || req.file.mimetype.startsWith('audio/') ? 'video' : (req.file.mimetype === 'application/pdf' ? 'raw' : 'image');
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'toeic-hub-files', resource_type: resourceType },
          (error, result) => {
            if (error) return reject(new ApiError(500, 'Lỗi khi upload file lên Cloudinary'));
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      fileUrl = uploadResult.secure_url;
      fileName = req.file.originalname;
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId,
        userId,
        content: content || '',
        fileUrl,
        fileName,
        parentId: parentId || null
      },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        parent: { include: { user: { select: { id: true, fullName: true } } } }
      }
    });

    // Phát socket cho những ai đang join room groupId
    const io = require('../socket').getIO();
    io.to(`group_${groupId}`).emit('new_group_message', message);

    return ApiResponse.created(res, 'Message sent', message);
  } catch (error) {
    next(error);
  }
};

exports.getGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });
    if (!isMember) {
      throw new ApiError(403, 'You must join the group to view messages');
    }

    const messages = await prisma.groupMessage.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        parent: { include: { user: { select: { id: true, fullName: true } } } }
      },
      orderBy: { createdAt: 'asc' }, // Older messages first
      take: 50 // Giới hạn 50 tin nhắn cuối
    });

    return ApiResponse.success(res, 'Messages fetched', messages);
  } catch (error) {
    next(error);
  }
};

exports.pinGroupMessage = async (req, res, next) => {
  try {
    const { groupId, msgId } = req.params;
    const { pinType } = req.body; // 'GENERAL', 'TIP', 'VOCABULARY'
    const userId = req.user.id;

    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });
    if (!isMember) {
      throw new ApiError(403, 'Bạn phải là thành viên để ghim tin nhắn');
    }

    const updated = await prisma.groupMessage.update({
      where: { id: msgId },
      data: { isPinned: true, pinType },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        parent: { include: { user: { select: { id: true, fullName: true } } } }
      }
    });

    const io = require('../socket').getIO();
    io.to(`group_${groupId}`).emit('message_pinned', updated);

    return ApiResponse.success(res, 'Ghim tin nhắn thành công', updated);
  } catch (error) {
    next(error);
  }
};

exports.unpinGroupMessage = async (req, res, next) => {
  try {
    const { groupId, msgId } = req.params;
    const userId = req.user.id;

    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });
    if (!isMember) {
      throw new ApiError(403, 'Bạn phải là thành viên để bỏ ghim tin nhắn');
    }

    const updated = await prisma.groupMessage.update({
      where: { id: msgId },
      data: { isPinned: false, pinType: null },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        parent: { include: { user: { select: { id: true, fullName: true } } } }
      }
    });

    const io = require('../socket').getIO();
    io.to(`group_${groupId}`).emit('message_unpinned', updated);

    return ApiResponse.success(res, 'Bỏ ghim thành công', updated);
  } catch (error) {
    next(error);
  }
};
exports.acceptGroupRequest = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const adminId = req.user.id;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.creatorId !== adminId) {
      throw new ApiError(403, 'Bạn không có quyền quản trị nhóm này');
    }

    const request = await prisma.groupRequest.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!request || request.status !== 'PENDING') {
      throw new ApiError(404, 'Không tìm thấy yêu cầu hoặc yêu cầu đã được xử lý');
    }

    await prisma.$transaction([
      prisma.groupRequest.update({
        where: { id: request.id },
        data: { status: 'APPROVED' }
      }),
      prisma.groupMember.create({
        data: { groupId, userId, role: 'MEMBER' }
      }),
      prisma.notification.create({
        data: {
          userId: userId,
          senderId: adminId,
          content: `Yêu cầu tham gia nhóm ${group.name} của bạn đã được chấp nhận.`,
          type: 'SYSTEM'
        }
      })
    ]);

    const io = require('../socket').getIO();
    if (io) io.to(userId).emit('new_notification', { type: 'SYSTEM', content: `Yêu cầu tham gia nhóm ${group.name} của bạn đã được chấp nhận.` });

    return ApiResponse.success(res, 'Đã chấp nhận yêu cầu tham gia');
  } catch (error) {
    next(error);
  }
};

exports.rejectGroupRequest = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const adminId = req.user.id;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.creatorId !== adminId) {
      throw new ApiError(403, 'Bạn không có quyền quản trị nhóm này');
    }

    const request = await prisma.groupRequest.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!request || request.status !== 'PENDING') {
      throw new ApiError(404, 'Không tìm thấy yêu cầu hoặc yêu cầu đã được xử lý');
    }

    await prisma.groupRequest.update({
      where: { id: request.id },
      data: { status: 'REJECTED' }
    });

    return ApiResponse.success(res, 'Đã từ chối yêu cầu tham gia');
  } catch (error) {
    next(error);
  }
};

exports.deleteGroupMessage = async (req, res, next) => {
  try {
    const { groupId, msgId } = req.params;
    const userId = req.user.id;

    const msg = await prisma.groupMessage.findUnique({
      where: { id: msgId }
    });

    if (!msg) throw new ApiError(404, 'Không tìm thấy tin nhắn');

    // User can delete their own message. Admin can delete anyone's.
    let canDelete = false;
    if (msg.userId === userId) {
      canDelete = true;
    } else {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (group && group.creatorId === userId) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      throw new ApiError(403, 'Bạn không có quyền thu hồi tin nhắn này');
    }

    const updated = await prisma.groupMessage.update({
      where: { id: msgId },
      data: { isDeleted: true, content: '', fileUrl: null, fileName: null },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } }
      }
    });

    const io = require('../socket').getIO();
    io.to(`group_${groupId}`).emit('message_deleted', updated);

    return ApiResponse.success(res, 'Đã thu hồi tin nhắn', updated);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!membership) {
      throw new ApiError(403, 'You must join the group to mark messages as read');
    }

    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { lastReadAt: new Date() }
    });

    const io = require('../socket').getIO();
    if (io) {
      // Emit to the reader so their UI updates
      io.to(userId).emit('messages_read', { groupId, readerId: userId });
    }

    return ApiResponse.success(res, 'Đã đánh dấu đã đọc', null);
  } catch (error) {
    next(error);
  }
};
