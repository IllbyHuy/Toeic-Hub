const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const sendEmail = require('../utils/email');
const { verifyEmailTemplate } = require('../utils/emailTemplates');
const userController = require('./user.controller');
const generateToken = (userId, rememberMe = false) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '7d'),
  });
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    // (Zod Middleware đã lo phần validate trống, nên ta không cần check thủ công nữa)

    let user;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = Math.floor(100000 + Math.random() * 900000).toString(); // OTP 6 số

    if (existingUser) {
      if (existingUser.isVerified) {
        throw new ApiError(400, 'Email đã được sử dụng');
      } else {
        // Tài khoản chưa xác thực (pre-register), cho phép tạo lại (update đè lên)
        user = await prisma.user.update({
          where: { email },
          data: {
            password: hashedPassword,
            fullName,
            verifyToken,
          }
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          verifyToken,
        },
      });
    }

    // Gửi email chứa OTP
    const year = new Date().getFullYear();
    const htmlMessage = verifyEmailTemplate(fullName, verifyToken, year);
    
    await sendEmail({
      to: user.email,
      subject: 'Xác thực email - Toeic-Hub',
      html: htmlMessage,
    });

    return ApiResponse.created(res, 'Đăng ký thành công. Vui lòng nhập mã OTP đã được gửi tới email.', null);
  } catch (error) {
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(404, 'Không tìm thấy tài khoản');
    }
    
    if (user.isVerified) {
      throw new ApiError(400, 'Tài khoản đã được kích hoạt');
    }

    if (user.verifyToken !== otp) {
      throw new ApiError(400, 'Mã OTP không hợp lệ');
    }

    // Cập nhật trạng thái
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verifyToken: null,
      },
    });

    return ApiResponse.success(res, 'Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.', null);
  } catch (error) {
    next(error);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApiError(404, 'Tài khoản không tồn tại');
    if (user.isVerified) throw new ApiError(400, 'Tài khoản đã được xác thực');

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.user.update({
      where: { email },
      data: { verifyToken: newOtp }
    });

    const year = new Date().getFullYear();
    const htmlMessage = verifyEmailTemplate(user.fullName, newOtp, year);
    
    await sendEmail({
      to: email,
      subject: 'Xác thực email - Toeic-Hub',
      html: htmlMessage,
    });

    return ApiResponse.success(res, 'Mã OTP mới đã được gửi', null);
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      throw new ApiError(404, 'Email không tồn tại trong hệ thống');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await prisma.user.update({
      where: { email },
      data: { verifyToken: otp }
    });

    const message = `
      <h2>Toeic-Hub - Khôi phục mật khẩu</h2>
      <p>Mã OTP khôi phục mật khẩu của bạn là: <strong style="font-size: 24px; color: #4CAF50;">${otp}</strong></p>
      <p>Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
    `;

    await sendEmail({
      to: email,
      subject: 'Toeic-Hub - Mã OTP khôi phục mật khẩu',
      html: message,
    });

    return ApiResponse.success(res, 'Mã OTP khôi phục đã được gửi vào email', null);
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApiError(404, 'Tài khoản không tồn tại');
    
    if (user.verifyToken !== otp) {
      throw new ApiError(400, 'Mã OTP không hợp lệ');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword,
        verifyToken: null // Xoá token sau khi đổi MK thành công
      }
    });

    return ApiResponse.success(res, 'Mật khẩu đã được đặt lại thành công', null);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(401, 'Email hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, 'Email hoặc mật khẩu không chính xác');
    }

    // Kiểm tra xem đã kích hoạt email chưa
    if (!user.isVerified) {
      throw new ApiError(403, 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email.');
    }

    const token = generateToken(user.id, rememberMe);
    
    // Update streak on login
    await userController.updateUserStreak(user.id);

    const userData = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };

    return ApiResponse.success(res, 'Đăng nhập thành công', { user: userData, token });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    // Update streak on app open
    await userController.updateUserStreak(req.user.id);
    return ApiResponse.success(res, 'Profile retrieved', req.user);
  } catch (error) {
    next(error);
  }
};

const getClientUrl = () => {
  if (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost')) {
    return process.env.CLIENT_URL.replace(/\/$/, '');
  }
  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    return 'https://toeic-hub-git-main-illbyhuys-projects.vercel.app';
  }
  return 'http://localhost:5173';
};

exports.oauthCallback = async (req, res, next) => {
  try {
    const clientUrl = getClientUrl();
    if (!req.user) {
      return res.redirect(`${clientUrl}/login?error=OAuthFailed`);
    }
    
    // Update streak on login
    await userController.updateUserStreak(req.user.id);
    
    const token = generateToken(req.user.id);
    // Chuyển hướng về frontend kèm token
    res.redirect(`${clientUrl}/oauth-success?token=${token}`);
  } catch (error) {
    next(error);
  }
};
