const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|mp3/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

class FileController {
  // Upload file
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const file = new File({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedBy: req.user.id
      });

      await file.save();

      res.status(201).json({ success: true, data: file });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get file
  async getFile(req, res) {
    try {
      const { fileId } = req.params;
      
      const file = await File.findById(fileId);
      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      res.sendFile(path.resolve(file.path));
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get shared files for chat
  async getSharedFiles(req, res) {
    try {
      const { chatId } = req.params;
      const { type, page = 1, limit = 20 } = req.query;

      const query = { chatId };
      if (type) query.mimetype = new RegExp(type, 'i');

      const files = await File.find(query)
        .populate('uploadedBy', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      res.json({ success: true, data: files });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

const fileController = new FileController();
fileController.upload = upload;

module.exports = fileController;