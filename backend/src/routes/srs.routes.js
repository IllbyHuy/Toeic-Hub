const express = require('express');
const router = express.Router();
const srsController = require('../controllers/srs.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/toggle-status', authenticate, srsController.toggleStatus);
router.get('/queue', authenticate, srsController.getSrsQueue);
router.post('/review', authenticate, srsController.submitReview);

module.exports = router;
