const { pool } = require('../config/db');

const addDealerPayment = async (req, res) => {
  const { dealer_id, amount, department_type, payment_mode, notes, date, master_entry_id } = req.body;
  
  if (!dealer_id || !amount || !department_type) {
    return res.status(400).json({ error: 'Missing required fields: dealer, amount, or department.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }

  try {
    const nowTime = new Date().toISOString().split('T')[1];
    const createdAt = date ? `${date}T${nowTime}` : new Date().toISOString();
    
    const paymentNotes = `${payment_mode || 'Cash'} Payment${notes ? ': ' + notes : ''}`;
    
    // We log it as a credit
    const [result] = await pool.query(`
      INSERT INTO dealer_ledgers_transactions 
      (dealer_id, department_type, transaction_type, amount, debit, credit, notes, master_entry_id, created_at, running_balance)
      VALUES (?, ?, 'Payment', ?, 0, ?, ?, ?, ?, 0)
    `, [dealer_id, department_type, parsedAmount, parsedAmount, paymentNotes, master_entry_id || null, createdAt]);
    
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add dealer payment' });
  }
};

module.exports = { addDealerPayment };
