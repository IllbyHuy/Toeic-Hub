const { z } = require('zod');

// Schema kiểm tra dữ liệu lúc Đăng ký
const registerSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email là bắt buộc' })
      .email('Email không đúng định dạng'),
    password: z
      .string({ required_error: 'Mật khẩu là bắt buộc' })
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    fullName: z
      .string({ required_error: 'Họ tên là bắt buộc' })
      .min(2, 'Họ tên phải có ít nhất 2 ký tự')
      .max(50, 'Họ tên không được vượt quá 50 ký tự'),
  }),
});

// Schema kiểm tra dữ liệu lúc Đăng nhập
const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(1, 'Mật khẩu là bắt buộc'),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
};
