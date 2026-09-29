module.exports = {
  nudgeEmailTemplate: (senderName, receiverName, streak) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:#ffffff;border-radius:22px;overflow:hidden;"><tr><td style="padding:22px 28px 0;font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:900;color:#3C3C3C;">Học Mỗi Ngày</td></tr><tr><td align="center" style="padding:14px 28px 0;"><div style="font-size:60px;line-height:64px;">&#128293;</div><div style="font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:72px;line-height:76px;font-weight:900;color:#F0452A;">${streak}</div><div style="font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:18px;font-weight:800;color:#F0452A;">ngày liên tiếp</div></td></tr><tr><td align="center" style="padding:18px 28px 24px;font-family:Nunito,'Segoe UI',Arial,sans-serif;"><h2 style="margin:0;font-size:24px;line-height:30px;color:#3C3C3C;">${senderName} vừa nhắc bạn học bài!</h2><p style="margin:10px 0 0;font-size:16px;line-height:24px;color:#6B6B6B;font-weight:700;">Đừng để ${senderName} chờ lâu, chỉ cần 5 phút thôi là chuỗi ${streak} ngày của bạn được giữ nguyên rồi đấy.</p></td></tr><tr><td align="center" style="padding:0 28px 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#F0452A" style="border-radius:16px;border-bottom:4px solid #b43420;"><a href="http://localhost:5173/feed" style="display:block;padding:15px 40px;font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:900;color:#ffffff;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">Vào học ngay</a></td></tr></table></td></tr><tr><td align="center" style="padding:14px 28px 0;font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:14px;color:#8A8A8A;font-weight:700;">Đừng để lỡ ngày hôm nay nhé!</td></tr><tr><td align="center" style="padding:26px 28px 24px;font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:12px;line-height:18px;color:#9A9A9A;">Bạn nhận email này vì bạn bè của bạn muốn nhắc nhở bạn.<br><a href="#" style="color:#9A9A9A;">Tắt tính năng nhắc nhở</a></td></tr></table></td></tr></table>
`,
  verifyEmailTemplate: (userName, otp, year) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Xác thực email - Toeic-Hub</title>
  <style>
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .h1 { font-size: 28px !important; line-height: 36px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;-webkit-text-size-adjust:100%;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Một bước nữa để bắt đầu theo dõi tiến bộ của bạn trên Toeic-Hub.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">

          <!-- Logo -->
          <tr>
            <td style="padding:0 0 24px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="32" height="32" align="center" valign="middle"
                      style="width:32px;height:32px;background-color:#111827;border-radius:9px;color:#FFFFFF;font-family:'Segoe UI',Arial,sans-serif;font-size:18px;font-weight:800;line-height:32px;">
                    T
                  </td>
                  <td style="padding-left:10px;font-family:'Segoe UI',Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.3px;color:#111827;">
                    toeic.<span style="color:#4F46E5;">hub</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td height="4" style="height:4px;line-height:4px;font-size:0;background-color:#4F46E5;border-radius:16px 16px 0 0;">&nbsp;</td>
                </tr>
                <tr>
                  <td class="px" style="padding:40px 40px 0 40px;">
                    <h1 class="h1" style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:32px;line-height:40px;font-weight:700;letter-spacing:-0.8px;color:#111827;">
                      Xác thực email,<br>
                      bắt đầu theo dõi <span style="color:#4F46E5;">tiến bộ.</span>
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:20px 40px 0 40px;font-family:'Segoe UI',Arial,sans-serif;font-size:16px;line-height:26px;color:#4B5563;">
                    Chào <strong style="color:#111827;">\${userName}</strong>, cảm ơn bạn đã đăng ký Toeic-Hub. Sử dụng mã OTP dưới đây để xác thực email của bạn.
                  </td>
                </tr>
                <tr>
                  <td class="px btn" style="padding:28px 40px 0 40px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="center" bgcolor="#F3F4F6" style="background-color:#F3F4F6;border-radius:10px;padding:24px;">
                          <div style="font-family:'Segoe UI',Arial,sans-serif;font-size:36px;font-weight:700;letter-spacing:8px;color:#111827;text-align:center;">
                            \${otp}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:32px 40px 0 40px;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">
                    Mã xác thực này có hiệu lực trong vòng 10 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:24px 40px 40px 40px;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:20px;color:#9CA3AF;">
                    Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 16px 0 16px;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;line-height:18px;color:#9CA3AF;">
              Một mục tiêu nhỏ. Cả bầu trời cơ hội.<br>
              © ${year} Toeic-Hub
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
};
