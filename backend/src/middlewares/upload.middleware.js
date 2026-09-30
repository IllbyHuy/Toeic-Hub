const multer = require('multer');
const ApiError = require('../utils/apiError');

// Dùng bộ nhớ đệm (MemoryStorage) thay vì lưu file xuống ổ cứng để tiết kiệm dung lượng server
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Chỉ cho phép upload ảnh, âm thanh hoặc PDF!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // Giới hạn kích thước tối đa 20MB
  },
});

module.exports = upload;
