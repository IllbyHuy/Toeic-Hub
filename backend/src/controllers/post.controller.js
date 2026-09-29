const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

exports.createPost = async (req, res, next) => {
  try {
    const { title, content, part, tags, groupId } = req.body;
    const authorId = req.user.id; // Lấy ID từ token đăng nhập

    if (!title || !content) {
      throw new ApiError(400, 'Title và content là bắt buộc');
    }

    let imageUrl = null;
    let fileUrl = null;
    let fileName = null;
    let imagePublicId = null;

    // Xử lý upload file lên Cloudinary
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'toeic-hub-posts', resource_type: 'auto' },
          (error, result) => {
            if (error) return reject(new ApiError(500, 'Lỗi khi upload file lên Cloudinary'));
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      if (req.file.mimetype.startsWith('image/')) {
        imageUrl = uploadResult.secure_url;
      } else {
        fileUrl = uploadResult.secure_url;
        fileName = req.file.originalname;
      }
      imagePublicId = uploadResult.public_id;
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        part: part || 'GENERAL',
        tags: tags ? JSON.parse(tags) : [], // Nhận array từ form-data
        imageUrl,
        fileUrl,
        fileName,
        imagePublicId,
        authorId,
        groupId: groupId || null,
      },
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true }, // Đã bỏ targetScore
        },
        group: {
          select: { id: true, name: true },
        },
      },
    });

    return ApiResponse.created(res, 'Post created successfully', post);
  } catch (error) {
    next(error);
  }
};

exports.getPosts = async (req, res, next) => {
  try {
    const { part, groupId, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};
    if (part) where.part = part;
    if (groupId) where.groupId = groupId;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
          group: {
            select: { id: true, name: true },
          },
          _count: {
            select: { comments: true },
          },
          votes: true,
          savedByUsers: true
        },
      }),
      prisma.post.count({ where }),
    ]);

    return ApiResponse.success(res, 'Posts fetched successfully', {
      posts,
      pagination: {
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        group: {
          select: { id: true, name: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        votes: true,
        savedByUsers: true,
      },
    });

    if (!post) {
      throw new ApiError(404, 'Post not found');
    }

    return ApiResponse.success(res, 'Post retrieved successfully', post);
  } catch (error) {
    next(error);
  }
};

exports.savePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingSave = await prisma.savedPost.findFirst({
      where: { userId, postId: id }
    });

    if (existingSave) {
      return ApiResponse.success(res, 'Post already saved');
    }

    await prisma.savedPost.create({
      data: { userId, postId: id }
    });

    const post = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true, title: true }
    });

    if (post && post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          senderId: userId,
          content: `${req.user.fullName} đã lưu bài viết "${post.title}" của bạn.`,
          type: 'SYSTEM',
          postId: id
        }
      });
      const io = require('../socket').getIO();
      if (io) io.to(post.authorId).emit('new_notification', { type: 'SYSTEM', content: `${req.user.fullName} đã lưu bài viết "${post.title}" của bạn.` });
    }

    return ApiResponse.success(res, 'Post saved successfully');
  } catch (error) {
    next(error);
  }
};

exports.unsavePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await prisma.savedPost.deleteMany({
      where: { userId, postId: id }
    });

    return ApiResponse.success(res, 'Post unsaved successfully');
  } catch (error) {
    next(error);
  }
};
