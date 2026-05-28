const { pool } = require('../config/db');

const getDealers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM dealer_network');
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dealers' });
  }
};

const createDealer = async (req, res) => {
  const { dealer_name, dealer_type, address, mobile, gst_no, contact_person, status } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO dealer_network (dealer_name, dealer_type, address, mobile, gst_no, contact_person, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dealer_name, dealer_type, address, mobile, gst_no, contact_person, status || 'Active']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create dealer' });
  }
};

const updateDealer = async (req, res) => {
  const id = req.params.id;
  const { dealer_name, dealer_type, address, mobile, gst_no, contact_person, status } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE dealer_network 
       SET dealer_name = ?, dealer_type = ?, address = ?, mobile = ?, gst_no = ?, contact_person = ?, status = ?
       WHERE id = ?`,
      [dealer_name, dealer_type, address, mobile, gst_no, contact_person, status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Dealer not found' });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update dealer' });
  }
};

const deleteDealer = async (req, res) => {
  const id = req.params.id;
  try {
    const [entries] = await pool.query('SELECT id FROM master_processing WHERE location_id = ? LIMIT 1', [id]);
    if (entries.length > 0) {
      return res.status(400).json({ error: 'Cannot delete dealer with existing transaction records.' });
    }
    const [result] = await pool.query('DELETE FROM dealer_network WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Dealer not found' });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete dealer' });
  }
};

module.exports = { getDealers, createDealer, updateDealer, deleteDealer };
