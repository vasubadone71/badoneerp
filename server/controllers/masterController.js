const { pool } = require('../config/db');

const getMasterEntries = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        m.*, n.dealer_name,
        i.status as insurance_status, i.policy_no, i.insurance_price_list, i.insurance_company,
        r.status as rto_status, r.registration_no, r.rto_price_list
      FROM master_processing m
      LEFT JOIN dealer_network n ON m.location_id = n.id
      LEFT JOIN insurance_department i ON m.id = i.master_entry_id
      LEFT JOIN rto_department r ON m.id = r.master_entry_id
      ORDER BY m.id DESC
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch master entries' });
  }
};

const createMasterEntry = async (req, res) => {
  const { s_no, location_id, invoice_no, invoice_date, customer_name, father_name, mobile_number, address, vehicle_model, vehicle_color, frame_no, engine_no, insurance_company } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(`
      INSERT INTO master_processing (s_no, location_id, invoice_no, invoice_date, customer_name, father_name, mobile_number, address, vehicle_model, vehicle_color, frame_no, engine_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [s_no, location_id, invoice_no, invoice_date, customer_name, father_name, mobile_number, address, vehicle_model, vehicle_color, frame_no, engine_no]);

    const newId = result.insertId;

    await connection.query('INSERT INTO insurance_department (master_entry_id, insurance_company) VALUES (?, ?)', [newId, insurance_company || null]);
    await connection.query('INSERT INTO rto_department (master_entry_id) VALUES (?)', [newId]);

    await connection.commit();
    res.status(201).json({ success: true, id: newId });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to create master entry' });
  } finally {
    connection.release();
  }
};

const updateMasterEntry = async (req, res) => {
  const id = req.params.id;
  const { s_no, location_id, invoice_no, invoice_date, customer_name, father_name, mobile_number, address, vehicle_model, vehicle_color, frame_no, engine_no } = req.body;
  try {
    const [result] = await pool.query(`
      UPDATE master_processing 
      SET s_no = ?, location_id = ?, invoice_no = ?, invoice_date = ?, 
          customer_name = ?, father_name = ?, mobile_number = ?, 
          address = ?, vehicle_model = ?, vehicle_color = ?, 
          frame_no = ?, engine_no = ?
      WHERE id = ?
    `, [s_no, location_id, invoice_no, invoice_date, customer_name, father_name, mobile_number, address, vehicle_model, vehicle_color, frame_no, engine_no, id]);
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Entry not found' });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update master entry' });
  }
};

const deleteMasterEntry = async (req, res) => {
  const id = req.params.id;
  
  // Handled by ON DELETE CASCADE in the DB schema for insurance, rto, and agent_ledgers
  try {
    const [result] = await pool.query('DELETE FROM master_processing WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Entry not found' });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete master entry' });
  }
};

module.exports = { getMasterEntries, createMasterEntry, updateMasterEntry, deleteMasterEntry };
