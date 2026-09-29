const express = require('express');
const router = express.Router();
const grammarController = require('../controllers/grammar.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.post('/', authenticate, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'voice', maxCount: 1 }]), grammarController.createGrammar);
router.get('/', authenticate, grammarController.getGrammars);
router.get('/:id', authenticate, grammarController.getGrammarById);
router.put('/:id', authenticate, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'voice', maxCount: 1 }]), grammarController.updateGrammar);
router.post('/:id/save', authenticate, grammarController.toggleSaveGrammar);
router.delete('/:id', authenticate, grammarController.deleteGrammar);

module.exports = router;
