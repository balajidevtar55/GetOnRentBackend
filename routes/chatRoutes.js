const express = require('express');
const { body } = require('express-validator');
const chatController = require('../controllers/chatController');
const verifyJWT = require('../middleware/verifyJWT');

const router = express.Router();

// Validation rules
const createChatValidation = [
  body('name').optional().isLength({ min: 1, max: 100 }),
  body('participants').isArray().withMessage('Participants must be an array')
];

const sendMessageValidation = [
  body('content').notEmpty().withMessage('Message content is required'),
  body('type').optional().isIn(['text', 'image', 'file', 'link'])
];

// Routes
router.get('/',verifyJWT, chatController.getConversations);
router.post('/',verifyJWT,  chatController.createChat);
router.get('/search',verifyJWT, chatController.searchMessages);
router.get('/:chatId',verifyJWT, chatController.getChat);
router.post('/sendmessages',verifyJWT,  chatController.sendMessage);
router.get('/read/:chatId',verifyJWT, chatController.markAsRead);
router.put('/updatemessage',verifyJWT, chatController.updateMessage);
router.delete('/messages/:messageId',verifyJWT, chatController.deleteMessage);

module.exports = router;