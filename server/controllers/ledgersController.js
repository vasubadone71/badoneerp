const { pool } = require('../config/db');

// Calculate Ledger Engine Helper
function calculateLedgerEngine(entries, openingBalance = 0) {
  entries.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id - b.id;
  });

  let runningBalance = openingBalance;
  
  const processedEntries = entries.map(entry => {
    const debit = parseFloat(entry.debit) || 0;
    const credit = parseFloat(entry.credit) || 0;
    runningBalance += debit - credit;
    return {
      ...entry,
      calculated_balance: runningBalance,
      is_dr: runningBalance > 0,
      is_cr: runningBalance < 0,
      formatted_balance: `₹${Math.abs(runningBalance).toLocaleString('en-IN')} ${runningBalance > 0 ? 'DR' : runningBalance < 0 ? 'CR' : ''}`.trim()
    };
  });

  const totalDebit = processedEntries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  const totalCredit = processedEntries.reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0);

  return {
    entries: processedEntries,
    closingBalance: runningBalance,
    formattedClosingBalance: `₹${Math.abs(runningBalance).toLocaleString('en-IN')} ${runningBalance > 0 ? 'DR' : runningBalance < 0 ? 'CR' : ''}`.trim(),
    totalDebit,
    totalCredit,
    is_dr: runningBalance > 0,
    is_cr: runningBalance < 0
  };
}

const getDealerLedgers = async (req, res) => {
  try {
    const [dealers] = await pool.query('SELECT id, dealer_name, dealer_type, mobile FROM dealer_network');
    
    const result = [];
    for (const dealer of dealers) {
      const [txs] = await pool.query('SELECT id, debit, credit, created_at FROM dealer_ledgers_transactions WHERE dealer_id = ?', [dealer.id]);
      
      const engine = calculateLedgerEngine(txs, 0);
      
      const [lastPayment] = await pool.query(`
        SELECT created_at FROM dealer_ledgers_transactions 
        WHERE dealer_id = ? AND transaction_type = 'Payment'
        ORDER BY created_at DESC LIMIT 1
      `, [dealer.id]);

      if (engine.totalDebit > 0 || engine.totalCredit > 0) {
        result.push({
          id: dealer.id,
          dealer_name: dealer.dealer_name,
          dealer_type: dealer.dealer_type || 'General',
          mobile: dealer.mobile,
          opening_balance: 0,
          total_debit: engine.totalDebit,
          total_credit: engine.totalCredit,
          total_outstanding: engine.closingBalance,
          formatted_outstanding: engine.formattedClosingBalance,
          is_dr: engine.is_dr,
          is_cr: engine.is_cr,
          last_payment_date: lastPayment.length > 0 ? lastPayment[0].created_at.toISOString().split('T')[0] : 'No payments'
        });
      }
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dealer ledgers' });
  }
};

const getDealerTransactions = async (req, res) => {
  const { dealerId, departmentType, startDate, endDate } = req.query;
  
  try {
    let query = `
      SELECT 
        t.*, n.dealer_name, n.dealer_type,
        m.customer_name, m.invoice_no
      FROM dealer_ledgers_transactions t
      JOIN dealer_network n ON t.dealer_id = n.id
      LEFT JOIN master_processing m ON t.master_entry_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (dealerId) {
      query += ` AND t.dealer_id = ?`;
      params.push(dealerId);
    }
    if (departmentType) {
      query += ` AND t.department_type = ?`;
      params.push(departmentType);
    }

    const [rawEntries] = await pool.query(query, params);
    let engine = calculateLedgerEngine(rawEntries, 0);

    let finalEntries = engine.entries;
    if (startDate && endDate) {
      finalEntries = finalEntries.filter(e => {
        const d = new Date(e.created_at).toISOString().split('T')[0];
        return d >= startDate && d <= endDate;
      });
    }

    // Removed finalEntries.reverse() so they display in chronological order (oldest to newest)
    
    res.status(200).json({
      transactions: finalEntries,
      summary: {
        closingBalance: engine.closingBalance,
        formattedClosingBalance: engine.formattedClosingBalance,
        is_dr: engine.is_dr,
        is_cr: engine.is_cr
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// Commissions Logic
const getCommissions = async (req, res) => {
  const { department, agent, dealer, status, startDate, endDate } = req.query;
  
  try {
    let query = `
      SELECT 
        ac.id, ac.master_entry_id, ac.department_type, ac.assigned_agent,
        ac.commission_type, ac.amount, ac.status, ac.notes, ac.paid_date,
        m.invoice_date, m.invoice_no, m.customer_name, m.frame_no, m.engine_no,
        n.dealer_name, n.dealer_type
      FROM agent_ledgers ac
      JOIN master_processing m ON ac.master_entry_id = m.id
      JOIN dealer_network n ON m.location_id = n.id
      WHERE 1=1
    `;
    const params = [];

    if (department) { query += ' AND ac.department_type = ?'; params.push(department); }
    if (agent) { query += ' AND ac.assigned_agent = ?'; params.push(agent); }
    if (dealer) { query += ' AND n.dealer_name = ?'; params.push(dealer); }
    if (status) { query += ' AND ac.status = ?'; params.push(status); }
    if (startDate && endDate) {
      query += ' AND m.invoice_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY m.invoice_date DESC, ac.id DESC';

    const [rows] = await pool.query(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
};

const getLedgerDashboardStats = async (req, res) => {
  try {
    const [[{ totalReceivable }]] = await pool.query('SELECT SUM(debit) as totalReceivable FROM dealer_ledgers_transactions');
    const [[{ totalReceived }]] = await pool.query('SELECT SUM(credit) as totalReceived FROM dealer_ledgers_transactions');

    const [dealerBalances] = await pool.query(`
      SELECT 
        n.dealer_type, 
        SUM(t.debit) - SUM(t.credit) as pending_balance
      FROM dealer_network n
      LEFT JOIN dealer_ledgers_transactions t ON n.id = t.dealer_id
      GROUP BY n.dealer_type
    `);

    let pendingMain = 0;
    let pendingASC = 0;
    let pendingFO = 0;

    for (const row of dealerBalances) {
      if (row.pending_balance > 0) { // Only count positive outstanding balances as pending
        if (row.dealer_type === 'Main Dealer') pendingMain += parseFloat(row.pending_balance);
        else if (row.dealer_type === 'ASC') pendingASC += parseFloat(row.pending_balance);
        else if (row.dealer_type === 'FO') pendingFO += parseFloat(row.pending_balance);
      }
    }

    res.status(200).json({
      totalReceivable: totalReceivable || 0,
      totalReceived: totalReceived || 0,
      pendingMain,
      pendingASC,
      pendingFO
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ledger dashboard stats' });
  }
};

module.exports = { getDealerLedgers, getDealerTransactions, getCommissions, getLedgerDashboardStats };
