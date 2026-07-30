const { pool } = require('../config/db');

// GET all number plate orders with master + dealer info
const getNumberPlates = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        np.*,
        m.s_no, m.location_id, m.invoice_no, m.invoice_date,
        m.customer_name, m.father_name, m.mobile_number, m.address,
        m.vehicle_model, m.vehicle_color, m.frame_no, m.engine_no,
        r.registration_no,
        n.dealer_name, n.dealer_type
      FROM number_plate_orders np
      JOIN master_processing m ON np.master_entry_id = m.id
      LEFT JOIN rto_department r ON m.id = r.master_entry_id
      LEFT JOIN dealer_network n ON m.location_id = n.id
      ORDER BY np.id DESC
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error('[NumberPlate] GET Error:', error);
    res.status(500).json({ error: 'Failed to fetch number plate orders' });
  }
};

// PUT — update status (Order Done / Gone In Reason)
const updateNumberPlate = async (req, res) => {
  const id = req.params.id;
  const { number_plate_status, number_plate_reason, order_date } = req.body;

  try {
    const allowedStatuses = ['Pending', 'Order Done', 'Gone In Reason'];
    if (!allowedStatuses.includes(number_plate_status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    await pool.query(`
      UPDATE number_plate_orders
      SET number_plate_status = ?,
          number_plate_reason = ?,
          order_date = ?
      WHERE id = ?
    `, [
      number_plate_status,
      number_plate_reason || null,
      order_date || null,
      id
    ]);

    // Emit real-time update
    const socketService = require('../services/socketService');
    socketService.emitDataChange('REFRESH_DASHBOARD', { type: 'number_plate' });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[NumberPlate] PUT Error:', error);
    res.status(500).json({ error: 'Failed to update number plate order' });
  }
};

// GET dashboard stats
const getNumberPlateStats = async (req, res) => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM number_plate_orders');
    const [[{ pending }]] = await pool.query("SELECT COUNT(*) as pending FROM number_plate_orders WHERE number_plate_status = 'Pending'");
    const [[{ done }]] = await pool.query("SELECT COUNT(*) as done FROM number_plate_orders WHERE number_plate_status = 'Order Done'");
    const [[{ reason }]] = await pool.query("SELECT COUNT(*) as reason FROM number_plate_orders WHERE number_plate_status = 'Gone In Reason'");

    res.status(200).json({ total: total || 0, pending: pending || 0, done: done || 0, reason: reason || 0 });
  } catch (error) {
    console.error('[NumberPlate] Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch number plate stats' });
  }
};

module.exports = { getNumberPlates, updateNumberPlate, getNumberPlateStats };
