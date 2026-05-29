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
    registration_no, rto_price_list, agent_commission, 
    vid_feeding_charge, penalty_charges, 
    rto_deducted_date, status 
  } = req.body;
  
  try {
    const pList = parseFloat(rto_price_list) || 0;
    const comm = parseFloat(agent_commission) || 0;
    const vid = parseFloat(vid_feeding_charge) || 0;
    const pen = parseFloat(penalty_charges) || 0;
    
    const actualDeducted = comm + vid + pen;
    const difference = pList - actualDeducted;

    const [result] = await pool.query(`
      UPDATE rto_department 
      SET registration_no = ?, rto_price_list = ?, rto_actual_deducted = ?, 
          rto_difference = ?, vid_feeding_charge = ?, penalty_charges = ?, 
          rto_deducted_date = ?, status = ?
      WHERE id = ?
    `, [
      registration_no, pList, actualDeducted, 
      difference, vid, pen, 
      rto_deducted_date || null, status, id
    ]);
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'RTO record not found' });
    
    // Agent Ledger Update (VASU BADONE)
    const diff = difference;
    
    // Check if an auto-generated ledger entry already exists for THIS specific RTO record
    const [existingAgentLedger] = await pool.query(
      'SELECT id FROM agent_ledgers WHERE source_id = ? AND source_type = ?',
      [id, 'RTO']
    );
    
    // We need the master_entry_id to find location_id (dealer_id)
    const [entryInfo] = await pool.query('SELECT master_entry_id FROM rto_department WHERE id = ?', [id]);
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
        [masterEntryId, 'RTO', 'VASU BADONE', 'Difference', diff, 'Pending', 'Difference Amount', id, 'RTO', 1]
      );
    }

    // Dealer Ledger Auto-Receivable Logic
    if (masterEntryId) {
      const [masterInfo] = await pool.query('SELECT location_id, s_no, customer_name FROM master_processing WHERE id = ?', [masterEntryId]);
      const dealerId = masterInfo.length > 0 ? masterInfo[0].location_id : null;
      
      if (dealerId) {
        const [existingDealerTx] = await pool.query(
          'SELECT id FROM dealer_ledgers_transactions WHERE master_entry_id = ? AND department_type = ? AND transaction_type = ?',
          [masterEntryId, 'RTO', 'Receivable']
        );

        if (pList > 0) {
          const notes = `Auto RTO Debit - S.No: ${masterInfo[0].s_no} (${masterInfo[0].customer_name})`;
          if (existingDealerTx.length > 0) {
            await pool.query(
              'UPDATE dealer_ledgers_transactions SET amount = ?, debit = ?, notes = ? WHERE id = ?',
              [pList, pList, notes, existingDealerTx[0].id]
            );
          } else {
            await pool.query(`
              INSERT INTO dealer_ledgers_transactions 
              (dealer_id, department_type, transaction_type, master_entry_id, amount, debit, credit, notes, created_at, running_balance)
              VALUES (?, 'RTO', 'Receivable', ?, ?, ?, 0, ?, NOW(), 0)
            `, [dealerId, masterEntryId, pList, pList, notes]);
          }
        } else if (existingDealerTx.length > 0) {
          await pool.query('DELETE FROM dealer_ledgers_transactions WHERE id = ?', [existingDealerTx[0].id]);
        }
      }
    }

    // Emit real-time update
    const socketService = require('../services/socketService');
    socketService.emitDataChange('ENTRY_UPDATED', { type: 'rto', id });
    socketService.emitDataChange('REFRESH_DASHBOARD', { type: 'rto' });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'DB Error: ' + (error.message || 'Failed to update RTO') });
  }
};

const deleteRTO = async (req, res) => {
  res.status(405).json({ message: 'RTO deletion is managed via Master Processing' });
};

module.exports = { getRTO, createRTO, updateRTO, deleteRTO };
