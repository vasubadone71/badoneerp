const { pool } = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const next7Date = new Date(Date.now() + 7 * 86400000);
    const next7 = next7Date.toISOString().split('T')[0];
    const next30Date = new Date(Date.now() + 30 * 86400000);
    const next30 = next30Date.toISOString().split('T')[0];

    // Insurance Stats
    const [[{ insTotal }]] = await pool.query('SELECT COUNT(*) as insTotal FROM insurance_department');
    const [[{ insPending }]] = await pool.query("SELECT COUNT(*) as insPending FROM insurance_department WHERE status != 'Completed'");
    const [[{ insCompleted }]] = await pool.query("SELECT COUNT(*) as insCompleted FROM insurance_department WHERE status = 'Completed'");
    const [[{ insToday }]] = await pool.query('SELECT COUNT(*) as insToday FROM insurance_department WHERE insurance_deducted_date = ?', [today]);
    const [[{ insExpiring }]] = await pool.query('SELECT COUNT(*) as insExpiring FROM insurance_department WHERE policy_expiry_date BETWEEN ? AND ?', [today, next30]);

    // RTO Stats
    const [[{ rtoTotal }]] = await pool.query('SELECT COUNT(*) as rtoTotal FROM rto_department');
    const [[{ rtoPending }]] = await pool.query("SELECT COUNT(*) as rtoPending FROM rto_department WHERE status != 'Completed'");
    const [[{ rtoCompleted }]] = await pool.query("SELECT COUNT(*) as rtoCompleted FROM rto_department WHERE status = 'Completed'");
    const [[{ rtoRegPending }]] = await pool.query("SELECT COUNT(*) as rtoRegPending FROM rto_department WHERE registration_no IS NULL OR registration_no = ''");
    const [[{ rtoToday }]] = await pool.query('SELECT COUNT(*) as rtoToday FROM rto_department WHERE rto_deducted_date = ?', [today]);

    // Renewal Reminder Stats
    const [[{ ren7 }]] = await pool.query('SELECT COUNT(*) as ren7 FROM insurance_department WHERE policy_expiry_date BETWEEN ? AND ?', [today, next7]);
    const [[{ ren30 }]] = await pool.query('SELECT COUNT(*) as ren30 FROM insurance_department WHERE policy_expiry_date BETWEEN ? AND ?', [today, next30]);
    const [[{ renExpired }]] = await pool.query('SELECT COUNT(*) as renExpired FROM insurance_department WHERE policy_expiry_date < ?', [today]);

    // Commission Stats
    const [[{ insComm }]] = await pool.query("SELECT SUM(amount) as insComm FROM agent_ledgers WHERE department_type = 'Insurance'");
    const [[{ rtoComm }]] = await pool.query("SELECT SUM(amount) as rtoComm FROM agent_ledgers WHERE department_type = 'RTO'");
    const [[{ pendComm }]] = await pool.query("SELECT SUM(amount) as pendComm FROM agent_ledgers WHERE status = 'Pending'");
    
    const dateObj = new Date();
    const thisMonthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).toISOString().split('T')[0];
    
    const [[{ monthlyComm }]] = await pool.query(`
      SELECT SUM(ac.amount) as monthlyComm 
      FROM agent_ledgers ac
      JOIN master_processing m ON ac.master_entry_id = m.id
      WHERE m.invoice_date >= ?
    `, [thisMonthStart]);

    // Number Plate Stats
    const [[{ npTotal }]] = await pool.query('SELECT COUNT(*) as npTotal FROM number_plate_orders');
    const [[{ npPending }]] = await pool.query("SELECT COUNT(*) as npPending FROM number_plate_orders WHERE number_plate_status = 'Pending'");
    const [[{ npDone }]] = await pool.query("SELECT COUNT(*) as npDone FROM number_plate_orders WHERE number_plate_status = 'Order Done'");
    const [[{ npReason }]] = await pool.query("SELECT COUNT(*) as npReason FROM number_plate_orders WHERE number_plate_status = 'Gone In Reason'");

    // Trends & Activity
    const [monthlyTrendRaw] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        SUM(CASE WHEN department_type = 'Insurance' THEN debit ELSE 0 END) as insurance,
        SUM(CASE WHEN department_type = 'RTO' THEN debit ELSE 0 END) as rto
      FROM dealer_ledgers_transactions
      WHERE transaction_type = 'Receivable'
      GROUP BY month ORDER BY month DESC LIMIT 6
    `);
    const monthlyTrend = monthlyTrendRaw.reverse();

    const [recentActivity] = await pool.query(`
      SELECT m.customer_name, m.invoice_no, m.invoice_date, 'Entry' as type, n.dealer_name
      FROM master_processing m
      JOIN dealer_network n ON m.location_id = n.id
      ORDER BY m.id DESC LIMIT 10
    `);

    res.status(200).json({
      insurance: { total: insTotal || 0, pending: insPending || 0, completed: insCompleted || 0, today: insToday || 0, expiring: insExpiring || 0 },
      rto: { total: rtoTotal || 0, pending: rtoPending || 0, completed: rtoCompleted || 0, regPending: rtoRegPending || 0, today: rtoToday || 0 },
      renewals: { next7: ren7 || 0, next30: ren30 || 0, expired: renExpired || 0 },
      commission: { insurance: insComm || 0, rto: rtoComm || 0, pending: pendComm || 0, monthly: monthlyComm || 0 },
      numberPlate: { total: npTotal || 0, pending: npPending || 0, done: npDone || 0, reason: npReason || 0 },
      monthly_trend: monthlyTrend,
      recent_activity: recentActivity
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

module.exports = { getDashboardStats };
