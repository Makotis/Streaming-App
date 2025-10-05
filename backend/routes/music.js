const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { body, validationResult } = require('express-validator');
const { s3 } = require('../config/aws');
const Song = require('../models/Song');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `music/${uniqueSuffix}-${file.originalname}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let songs;
    if (search) {
      songs = await Song.search(search, parseInt(limit), parseInt(offset));
    } else {
      songs = await Song.findAll(parseInt(limit), parseInt(offset));
    }

    res.json({ songs, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get songs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json({ song });
  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/upload', authenticateToken, upload.single('audio'), [
  body('title').notEmpty().trim().escape(),
  body('artist').notEmpty().trim().escape(),
  body('album').optional().trim().escape(),
  body('duration').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const { title, artist, album, duration } = req.body;
    const file_url = req.file.location;

    const song = await Song.create({
      title,
      artist,
      album: album || null,
      duration: duration ? parseInt(duration) : null,
      file_url,
      user_id: req.user.id
    });

    res.status(201).json({ message: 'Song uploaded successfully', song });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const songs = await Song.findByUser(req.params.userId, parseInt(limit), parseInt(offset));
    res.json({ songs, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get user songs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const song = await Song.delete(req.params.id, req.user.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found or unauthorized' });
    }

    const s3Key = song.file_url.split('/').slice(-2).join('/');
    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key
    }).promise();

    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Delete song error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;