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
    const nowTime = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    const createdAt = date ? `${date} ${nowTime}` : new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const paymentNotes = `${payment_mode || 'Cash'} Payment${notes ? ': ' + notes : ''}`;
    
    // We log it as a credit
    const [result] = await pool.query(`
      INSERT INTO dealer_ledgers_transactions 
      (dealer_id, department_type, transaction_type, amount, debit, credit, payment_mode, notes, master_entry_id, created_at, running_balance)
      VALUES (?, ?, 'Payment', ?, 0, ?, ?, ?, ?, ?, 0)
    `, [dealer_id, department_type, parsedAmount, parsedAmount, payment_mode || 'Cash', paymentNotes, master_entry_id || null, createdAt]);
    
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error: ' + (error.message || 'Failed to add dealer payment') });
  }
};

const deleteDealerPayment = async (req, res) => {
  const id = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM dealer_ledgers_transactions WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.status(200).json({ success: true, message: 'Transaction deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error: ' + (error.message || 'Failed to delete transaction') });
  }
};

module.exports = { addDealerPayment, deleteDealerPayment };
