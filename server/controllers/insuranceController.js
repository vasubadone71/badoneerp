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
    agent_commission, penalty_charges, 
    policy_start_date, policy_expiry_date, insurance_deducted_date, 
    zero_def, third_party, status, remarks 
  } = req.body;
  
  try {
    const pList = parseFloat(insurance_price_list) || 0;
    const comm = parseFloat(agent_commission) || 0;
    const pen = parseFloat(penalty_charges) || 0;
    
    const actualDeducted = comm + pen;
    const difference = pList - actualDeducted;

    const [result] = await pool.query(`
      UPDATE insurance_department 
      SET policy_no = ?, insurance_company = ?, insurance_price_list = ?, 
          insurance_actual_deducted = ?, insurance_difference = ?, penalty_charges = ?, 
          policy_start_date = ?, policy_expiry_date = ?, insurance_deducted_date = ?, 
          zero_def = ?, third_party = ?, status = ?, remarks = ?
      WHERE id = ?
    `, [
      policy_no, insurance_company, pList, 
      actualDeducted, difference, pen, 
      policy_start_date || null, policy_expiry_date || null, insurance_deducted_date || null, 
      zero_def ? 1 : 0, third_party ? 1 : 0, status, remarks || null, id
    ]);
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Insurance record not found' });
    
    // Agent Ledger Update (TEERTH BADONE)
    const diff = difference;
    
    // Check if an auto-generated ledger entry already exists for THIS specific Insurance record
    const [existingAgentLedger] = await pool.query(
      'SELECT id FROM agent_ledgers WHERE source_id = ? AND source_type = ?',
      [id, 'Insurance']
    );
    
    // We need the master_entry_id to find location_id (dealer_id)
    const [entryInfo] = await pool.query('SELECT master_entry_id FROM insurance_department WHERE id = ?', [id]);
    const masterEntryId = entryInfo.length > 0 ? entryInfo[0].master_entry_id : null;

    if (existingAgentLedger.length > 0) {
      if (diff > 0) {
        await pool.query('UPDATE agent_ledgers SET amount = ? WHERE id = ?', [diff, existingAgentLedger[0].id]);
      } else {
        await pool.query('DELETE FROM agent_ledgers WHERE id = ?', [existingAgentLedger[0].id]);
      }
    } else if (diff > 0 && masterEntryId) {
      await pool.query(
        'INSERT INTO agent_ledgers (master_entry_id, department_type, assigned_agent, commission_type, amount, status, notes, source_id, source_type, auto_generated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [masterEntryId, 'Insurance', 'TEERTH BADONE', 'Difference', diff, 'Pending', 'Difference Amount', id, 'Insurance', 1]
      );
    }

    // Dealer Ledger Auto-Receivable Logic
    if (masterEntryId) {
      const [masterInfo] = await pool.query('SELECT location_id, s_no, customer_name FROM master_processing WHERE id = ?', [masterEntryId]);
      const dealerId = masterInfo.length > 0 ? masterInfo[0].location_id : null;
      
      if (dealerId) {
        const [existingDealerTx] = await pool.query(
          'SELECT id FROM dealer_ledgers_transactions WHERE master_entry_id = ? AND department_type = ? AND transaction_type = ?',
          [masterEntryId, 'Insurance', 'Receivable']
        );

        if (pList > 0) {
          const notes = `Auto Insurance Debit - S.No: ${masterInfo[0].s_no} (${masterInfo[0].customer_name})`;
          if (existingDealerTx.length > 0) {
            await pool.query(
              'UPDATE dealer_ledgers_transactions SET amount = ?, debit = ?, notes = ? WHERE id = ?',
              [pList, pList, notes, existingDealerTx[0].id]
            );
          } else {
            await pool.query(`
              INSERT INTO dealer_ledgers_transactions 
              (dealer_id, department_type, transaction_type, master_entry_id, amount, debit, credit, notes, created_at, running_balance)
              VALUES (?, 'Insurance', 'Receivable', ?, ?, ?, 0, ?, NOW(), 0)
            `, [dealerId, masterEntryId, pList, pList, notes]);
          }
        } else if (existingDealerTx.length > 0) {
          await pool.query('DELETE FROM dealer_ledgers_transactions WHERE id = ?', [existingDealerTx[0].id]);
        }
      }
    }

    // Emit real-time update
    const socketService = require('../services/socketService');
    socketService.emitDataChange('ENTRY_UPDATED', { type: 'insurance', id });
    socketService.emitDataChange('REFRESH_DASHBOARD', { type: 'insurance' });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'DB Error: ' + (error.message || 'Failed to update insurance') });
  }
};

const deleteInsurance = async (req, res) => {
  res.status(405).json({ message: 'Insurance deletion is managed via Master Processing' });
};

module.exports = { getInsurance, createInsurance, updateInsurance, deleteInsurance };
