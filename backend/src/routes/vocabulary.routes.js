const express = require('express');
const router = express.Router();
const vocabularyController = require('../controllers/vocabulary.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/', authenticate, vocabularyController.createVocabulary);
router.patch('/:id', authenticate, vocabularyController.updateVocabulary);
router.get('/', authenticate, vocabularyController.getVocabularies);
router.delete('/:id', authenticate, vocabularyController.deleteVocabulary);

// SRS Endpoints
router.get('/study-session', authenticate, vocabularyController.getStudySession);
router.post('/review', authenticate, vocabularyController.reviewVocabulary);

router.post('/import', authenticate, vocabularyController.importVocabularies);
router.get('/export', authenticate, vocabularyController.exportVocabularies);

module.exports = router;
