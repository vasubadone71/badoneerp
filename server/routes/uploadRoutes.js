const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const upload = require('../middleware/uploadMiddleware');

// 'document' is the field name we expect in the form-data
router.post('/', upload.single('document'), uploadController.uploadDocument);

module.exports = router;
