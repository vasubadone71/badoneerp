const { pool } = require('../config/db');

const getInsurance = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        i.*, 
        m.s_no, m.location_id, m.invoice_no, m.invoice_date, m.customer_name, 
        m.father_name, m.mobile_number, m.address, m.vehicle_model, 
        m.vehicle_color, m.frame_no, m.engine_no,
        n.dealer_name 
      FROM insurance_department i
      JOIN master_processing m ON i.master_entry_id = m.id
      LEFT JOIN dealer_network n ON m.location_id = n.id
      ORDER BY i.id DESC
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch insurance details' });
  }
};

const createInsurance = async (req, res) => {
  // Insurance is created automatically when master entry is created.
  res.status(405).json({ message: 'Insurance is created via Master Processing' });
};

const updateInsurance = async (req, res) => {
  const id = req.params.id;
  const { 
    policy_no, insurance_company, insurance_price_list, 
    insurance_actual_deducted, insurance_difference, penalty_charges, 
    policy_start_date, policy_expiry_date, insurance_deducted_date, 
    zero_def, third_party, status 
  } = req.body;
  
  try {
    const [result] = await pool.query(`
      UPDATE insurance_department 
      SET policy_no = ?, insurance_company = ?, insurance_price_list = ?, 
          insurance_actual_deducted = ?, insurance_difference = ?, penalty_charges = ?, 
          policy_start_date = ?, policy_expiry_date = ?, insurance_deducted_date = ?, 
          zero_def = ?, third_party = ?, status = ?
      WHERE id = ?
    `, [
      policy_no, insurance_company, insurance_price_list, 
      insurance_actual_deducted, insurance_difference, penalty_charges, 
      policy_start_date || null, policy_expiry_date || null, insurance_deducted_date || null, 
      zero_def ? 1 : 0, third_party ? 1 : 0, status, id
    ]);
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Insurance record not found' });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update insurance' });
  }
};

const deleteInsurance = async (req, res) => {
  res.status(405).json({ message: 'Insurance deletion is managed via Master Processing' });
};

module.exports = { getInsurance, createInsurance, updateInsurance, deleteInsurance };
