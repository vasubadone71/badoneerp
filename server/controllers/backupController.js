const mysqldump = require('mysqldump');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');

const createBackup = async (req, res) => {
  try {
    const filename = `backup_${Date.now()}.sql`;
    const backupsDir = path.join(__dirname, '../backups');
    
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    const dumpPath = path.join(backupsDir, filename);

    await mysqldump({
      connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
      dumpToFile: dumpPath,
    });

    await pool.query('INSERT INTO backup_history (backup_date, filename) VALUES (NOW(), ?)', [filename]);

    res.status(200).json({ 
      success: true, 
      message: 'Backup created successfully.',
      filename
    });
  } catch (error) {
    console.error('Backup creation failed:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
};

const getBackupHistory = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM backup_history ORDER BY id DESC');
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch backup history' });
  }
};

const downloadBackup = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../backups', filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
      }
    });
  } else {
    res.status(404).send('Backup file not found on server.');
  }
};

const restoreBackup = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded.' });
    }

    const filePath = req.file.path;
    const sqlScript = fs.readFileSync(filePath, 'utf8');

    // Run the SQL script
    console.log('[Backup] Starting restore from file:', req.file.filename);
    
    // Using the pool that has multipleStatements: true
    await pool.query(sqlScript);

    console.log('[Backup] Restore completed successfully.');
    res.status(200).json({ success: true, message: 'Database restored successfully' });
  } catch (error) {
    console.error('[Backup] Restore failed:', error);
    res.status(500).json({ error: 'Failed to restore database: ' + error.message });
  }
};

module.exports = { createBackup, getBackupHistory, downloadBackup, restoreBackup };
