const { pool } = require('../config/db');

const getRTO = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*, 
        m.s_no, m.location_id, m.invoice_no, m.invoice_date, m.customer_name, 
        m.father_name, m.mobile_number, m.address, m.vehicle_model, 
        m.vehicle_color, m.frame_no, m.engine_no,
        n.dealer_name 
      FROM rto_department r
      JOIN master_processing m ON r.master_entry_id = m.id
      LEFT JOIN dealer_network n ON m.location_id = n.id
      ORDER BY r.id DESC
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch RTO details' });
  }
};

const createRTO = async (req, res) => {
  res.status(405).json({ message: 'RTO is created via Master Processing' });
};

const updateRTO = async (req, res) => {
  const id = req.params.id;
  const { 
    registration_no, rto_price_list, rto_actual_deducted, 
    rto_difference, vid_feeding_charge, penalty_charges, 
    rto_deducted_date, status 
  } = req.body;
  
  try {
    const [result] = await pool.query(`
      UPDATE rto_department 
      SET registration_no = ?, rto_price_list = ?, rto_actual_deducted = ?, 
          rto_difference = ?, vid_feeding_charge = ?, penalty_charges = ?, 
          rto_deducted_date = ?, status = ?
      WHERE id = ?
    `, [
      registration_no, rto_price_list, rto_actual_deducted, 
      rto_difference, vid_feeding_charge, penalty_charges, 
      rto_deducted_date || null, status, id
    ]);
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'RTO record not found' });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update RTO' });
  }
};

const deleteRTO = async (req, res) => {
  res.status(405).json({ message: 'RTO deletion is managed via Master Processing' });
};

module.exports = { getRTO, createRTO, updateRTO, deleteRTO };
