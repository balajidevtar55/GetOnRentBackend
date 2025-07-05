const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { validationResult } = require('express-validator');
const user = require('../models/user');

class ChatController {
    // Get all conversations for a user
    async getConversations(req, res) {
        try {
            const userId = req.userId;
            const { page = 1, limit = 20, search = '' } = req.query;

            const conversations = await Chat.find({
                participants: userId,
                ...(search && {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { 'lastMessage.content': { $regex: search, $options: 'i' } }
                    ]
                })
            })
                .populate('participants', 'name avatar status')
                .populate('lastMessage')
                .sort({ updatedAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            res.json({
                success: true,
                data: conversations,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(await Chat.countDocuments({ participants: userId }) / limit)
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Get specific chat with messages
    async getChat(req, res) {
        try {
            const { chatId } = req.params;
            const userId = req.userId;
            const { page = 1, limit = 50 } = req.query;

            const chat = await Chat.findOne({
                _id: chatId,
                participants: userId
            }).populate('participants', 'name avatar status');

            if (!chat) {
                return res.status(404).json({ success: false, message: 'Chat not found' });
            }

            let messages = await Message.find({ chatId })
                .populate('sender', 'name avatar') // this may return null for missing users
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            let senderInfo;

            try {
                senderInfo = await user.findById(userId).select('name avatar');
            } catch (err) {
                console.error("Error fetching sender:", err);
            }

            const formattedMessages = messages.map((msg) => {
                const baseSender = msg.sender?._id
                    ? {
                        ...msg.sender.toObject(),
                        name: msg.sender.name || 'Unknown User',
                        avatar: msg.sender.avatar,
                    }
                    : {
                        _id: userId, // fallback id
                        name: senderInfo?.name || 'Unknown User',
                        avatar: senderInfo?.avatar || null,
                    };

                return {
                    ...msg.toObject(),
                    sender: baseSender,
                };
            });

            res.json({
                success: true,
                data: {
                    chat,
                    messages: formattedMessages.reverse(),
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Create new chat
    async createChat(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { participants, name, type = 'direct' } = req.body;
            const userId = req.userId;

            // Combine and sort all participant IDs
            const allParticipants = [...new Set([userId, ...participants])].map(String).sort();

            // Find all chats of same type with same participant count
            const possibleChats = await Chat.find({
                type,
                participants: { $size: allParticipants.length }
            });

            // Compare exact participant arrays
            const existingChat = possibleChats.find(chat => {
                const chatParticipants = chat.participants.map(id => id.toString()).sort();
                return JSON.stringify(chatParticipants) === JSON.stringify(allParticipants);
            });

            if (existingChat) {
                return res.status(200).json({
                    success: true,
                    data: existingChat,
                    message: 'Chat already exists'
                });
            }

            // Create new chat
            const chat = new Chat({
                participants: allParticipants,
                name,
                type,
                createdBy: userId,
            });

            await chat.save();
            await chat.populate('participants', 'name avatar status');

            return res.status(201).json({ success: true, data: chat });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // Send message
    async sendMessage(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { chatId, content, type = 'text', attachments = [] } = req.body;
            const userId = req.userId;
            // Verify user is part of chat
            const chat = await Chat.findOne({
                _id: chatId,
                participants: userId
            });

            const receiverId = chat.participants.find(participant =>
                participant._id.toString() !== userId.toString()
            );
            if (!chat) {
                return res.status(404).json({ success: false, message: 'Chat not found' });
            }

            const message = new Message({
                chatId,
                sender: userId,
                content,
                type,
                attachments,
                receiver: receiverId,
            });

            await message.save();
            await message.populate('sender', 'name avatar');

            // Update chat's last message
            chat.lastMessage = message._id;
            chat.updatedAt = new Date();
            await chat.save();

            // Emit to socket
            // const io = req.app.get('io');
            const io = req.app.get('io');

            // Emit to chat room
            io.to(chatId).emit('new-message', message);
            console.log(`✅ Message sent to chat room ${receiverId} and ${userId}`);
            // Emit to personal rooms
            io.to(`user-${userId}`).emit('new-message', message);
            io.to(`user-${receiverId}`).emit('new-message', message);

            console.log('✅ Message sent via API');
            // io.to(chatId).emit('new-message', message);
            res.status(201).json({ success: true, data: message });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Update message (edit)
    async updateMessage(req, res) {
        try {
            const { content, messageId } = req.body;
            console.log(content, messageId);
            const userId = req.userId;

            const message = await Message.findOne({
                _id: messageId,
                sender: userId
            });

            if (!message) {
                return res.status(404).json({ success: false, message: 'Message not found' });
            }

            message.content = content;
            message.isEdited = true;
            message.editedAt = new Date();
            await message.save();

            // Emit to socket
            const io = req.app.get('io');
            io.to(message.chatId.toString()).emit('message-updated', message);

            res.json({ success: true, data: message });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Delete message
    async deleteMessage(req, res) {
        try {
            const { messageId } = req.params;
            const userId = req.userId;

            // Check if the message exists and belongs to the user
            const message = await Message.findOne({
                _id: messageId,
                sender: userId,
            });

            if (!message) {
                return res.status(404).json({ success: false, message: 'Message not found' });
            }

            // Permanently delete the message
            await message.deleteOne();

            const chatId = message.chatId.toString();
            // Emit to socket
            const io = req.app.get('io');
            io.to(message.chatId.toString()).emit('message-deleted', { messageId, chatId });

            res.json({ success: true, message: 'Message permanently deleted' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }


    // Mark messages as read
    async markAsRead(req, res) {
        try {
            const { chatId } = req.params;
            const userId = req.userId;

            await Message.updateMany(
                { chatId, sender: { $ne: userId }, isRead: false },
                { isRead: true, readAt: new Date() }
            );

            res.json({ success: true, message: 'Messages marked as read' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Search messages
    async searchMessages(req, res) {
        try {
            const { query, chatId } = req.query;
            const userId = req.userId;
            const { page = 1, limit = 20 } = req.query;

            const searchCriteria = {
                content: { $regex: query, $options: 'i' },
                isDeleted: false
            };

            if (chatId) {
                // Verify user has access to this chat
                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: userId
                });

                if (!chat) {
                    return res.status(404).json({ success: false, message: 'Chat not found' });
                }

                searchCriteria.chatId = chatId;
            } else {
                // Search across all user's chats
                const userChats = await Chat.find({ participants: userId }).select('_id');
                searchCriteria.chatId = { $in: userChats.map(chat => chat._id) };
            }

            const messages = await Message.find(searchCriteria)
                .populate('sender', 'name avatar')
                .populate('chatId', 'name type')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            res.json({ success: true, data: messages });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ChatController();