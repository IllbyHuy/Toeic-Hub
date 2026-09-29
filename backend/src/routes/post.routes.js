const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const upload = require('../middlewares/upload.middleware');

router.get('/', postController.getPosts);
router.get('/:id', postController.getPostById);
// Chặn 1: Phải đăng nhập (authenticate)
// Chặn 2: Phải đi qua cổng kiểm tra ảnh (upload.single('image')) - tối đa 5MB, chỉ nhận ảnh
router.post('/', authenticate, upload.single('file'), postController.createPost);

router.post('/:id/save', authenticate, postController.savePost);
router.delete('/:id/save', authenticate, postController.unsavePost);

module.exports = router;
