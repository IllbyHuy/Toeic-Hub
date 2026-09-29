const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  try {
    // Để setup thực tế, bạn cần điền EMAIL_USER và EMAIL_PASS vào file .env (Sử dụng App Password của Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // Cấu hình tạm để test
        pass: process.env.EMAIL_PASS || 'your-app-password',
      },
    });

    const mailOptions = {
      from: '"Toeic-Hub" <noreply@toeichub.com>',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    // Trong môi trường dev chưa có email thật, ta cứ bỏ qua lỗi để code chạy tiếp
    return false;
  }
};

module.exports = sendEmail;
