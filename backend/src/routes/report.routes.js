const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/', authenticate, reportController.createReport);
router.get('/', authenticate, reportController.getReports);
router.patch('/:id', authenticate, reportController.updateReport);

module.exports = router;
