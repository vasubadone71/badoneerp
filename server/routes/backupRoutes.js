const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const backupController = require('../controllers/backupController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const backupsDir = path.join(__dirname, '../backups/');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    cb(null, backupsDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'restore_' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post('/create', backupController.createBackup);
router.get('/history', backupController.getBackupHistory);
router.get('/download/:filename', backupController.downloadBackup);
router.post('/restore', upload.single('backupFile'), backupController.restoreBackup);

module.exports = router;
