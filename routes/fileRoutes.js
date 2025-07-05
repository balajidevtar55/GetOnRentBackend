const express = require('express');
const fileController = require('../controllers/fileController');

const router = express.Router();

router.post('/upload', fileController.upload.single('file'), fileController.uploadFile);
router.get('/:fileId', fileController.getFile);
router.get('/chat/:chatId', fileController.getSharedFiles);

module.exports = router;