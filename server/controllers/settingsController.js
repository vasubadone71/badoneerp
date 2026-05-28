const { pool } = require('../config/db');

const getSettings = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    res.status(200).json(rows[0] || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

const saveSettings = async (req, res) => {
  const { auto_backup, company_name, address, gst, contact_info, logo_base64 } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM settings ORDER BY id DESC LIMIT 1');
    if (existing.length > 0) {
      await pool.query(`
        UPDATE settings 
        SET auto_backup = ?, company_name = ?, address = ?, gst = ?, contact_info = ?, logo_base64 = ?
        WHERE id = ?
      `, [auto_backup ? 1 : 0, company_name, address, gst, contact_info, logo_base64, existing[0].id]);
    } else {
      await pool.query(`
        INSERT INTO settings 
        (auto_backup, company_name, address, gst, contact_info, logo_base64)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [auto_backup ? 1 : 0, company_name, address, gst, contact_info, logo_base64]);
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
};

module.exports = { getSettings, saveSettings };
