const { ipcMain, dialog, app } = require('electron');
const { getDb } = require('./database');
const fs = require('fs');
const path = require('path');
const { machineIdSync } = require('node-machine-id');

function setupIpcHandlers(mainWindow) {
  const db = getDb();

  // Settings & Machine ID
  ipcMain.handle('get-settings', () => {
    return db.prepare('SELECT * FROM settings ORDER BY id DESC LIMIT 1').get() || {};
  });

  ipcMain.handle('save-settings', (event, settings) => {
    const existing = db.prepare('SELECT * FROM settings ORDER BY id DESC LIMIT 1').get();
    if (existing) {
      const stmt = db.prepare('UPDATE settings SET auto_backup = ?, company_name = ?, address = ?, gst = ?, contact_info = ? WHERE id = ?');
      stmt.run(settings.auto_backup ? 1 : 0, settings.company_name, settings.address, settings.gst, settings.contact_info, existing.id);
    } else {
      const stmt = db.prepare('INSERT INTO settings (auto_backup, company_name, address, gst, contact_info) VALUES (?, ?, ?, ?, ?)');
      stmt.run(settings.auto_backup ? 1 : 0, settings.company_name, settings.address, settings.gst, settings.contact_info);
    }
    return true;
  });

  ipcMain.handle('verify-machine-id', () => {
    const currentId = machineIdSync();
    let setting = db.prepare('SELECT * FROM settings ORDER BY id DESC LIMIT 1').get();
    if (!setting) {
      db.prepare('INSERT INTO settings (machine_id) VALUES (?)').run(currentId);
      return true;
    } else if (!setting.machine_id) {
      db.prepare('UPDATE settings SET machine_id = ? WHERE id = ?').run(currentId, setting.id);
      return true;
    }
    return setting.machine_id === currentId;
  });

  // Dashboard Stats (Updated for Operational ERP Focus)
  ipcMain.handle('get-dashboard-stats', () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const next7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const next30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      // Insurance Stats
      const insTotal = (db.prepare('SELECT COUNT(*) as count FROM insurance_details').get() || { count: 0 }).count;
      const insPending = (db.prepare("SELECT COUNT(*) as count FROM insurance_details WHERE status != 'Completed'").get() || { count: 0 }).count;
      const insCompleted = (db.prepare("SELECT COUNT(*) as count FROM insurance_details WHERE status = 'Completed'").get() || { count: 0 }).count;
      const insToday = (db.prepare('SELECT COUNT(*) as count FROM insurance_details WHERE insurance_deducted_date = ?').get(today) || { count: 0 }).count;
      const insExpiring = (db.prepare('SELECT COUNT(*) as count FROM insurance_details WHERE policy_expiry_date BETWEEN ? AND ?').get(today, next30) || { count: 0 }).count;

      // RTO Stats
      const rtoTotal = (db.prepare('SELECT COUNT(*) as count FROM rto_details').get() || { count: 0 }).count;
      const rtoPending = (db.prepare("SELECT COUNT(*) as count FROM rto_details WHERE status != 'Completed'").get() || { count: 0 }).count;
      const rtoCompleted = (db.prepare("SELECT COUNT(*) as count FROM rto_details WHERE status = 'Completed'").get() || { count: 0 }).count;
      const rtoRegPending = (db.prepare("SELECT COUNT(*) as count FROM rto_details WHERE registration_no IS NULL OR registration_no = ''").get() || { count: 0 }).count;
      const rtoToday = (db.prepare('SELECT COUNT(*) as count FROM rto_details WHERE rto_deducted_date = ?').get(today) || { count: 0 }).count;

      // Renewal Reminder Stats
      const ren7 = (db.prepare('SELECT COUNT(*) as count FROM insurance_details WHERE policy_expiry_date BETWEEN ? AND ?').get(today, next7) || { count: 0 }).count;
      const ren30 = (db.prepare('SELECT COUNT(*) as count FROM insurance_details WHERE policy_expiry_date BETWEEN ? AND ?').get(today, next30) || { count: 0 }).count;
      const renExpired = (db.prepare('SELECT COUNT(*) as count FROM insurance_details WHERE policy_expiry_date < ?').get(today) || { count: 0 }).count;

      // Compact Commission Stats
      const insComm = (db.prepare("SELECT SUM(amount) as total FROM agent_commissions WHERE department_type = 'Insurance'").get() || { total: 0 }).total || 0;
      const rtoComm = (db.prepare("SELECT SUM(amount) as total FROM agent_commissions WHERE department_type = 'RTO'").get() || { total: 0 }).total || 0;
      const pendComm = (db.prepare("SELECT SUM(amount) as total FROM agent_commissions WHERE status = 'Pending'").get() || { total: 0 }).total || 0;
      
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const monthlyComm = (db.prepare(`
        SELECT SUM(ac.amount) as total 
        FROM agent_commissions ac
        JOIN master_entries m ON ac.master_entry_id = m.id
        WHERE m.invoice_date >= ?
      `).get(thisMonthStart) || { total: 0 }).total || 0;

      // Trends & Activity
      const monthlyTrend = db.prepare(`
        SELECT 
          strftime('%Y-%m', m.invoice_date) as month,
          SUM(CASE WHEN ac.department_type = 'Insurance' THEN ac.amount ELSE 0 END) as insurance,
          SUM(CASE WHEN ac.department_type = 'RTO' THEN ac.amount ELSE 0 END) as rto
        FROM agent_commissions ac
        JOIN master_entries m ON ac.master_entry_id = m.id
        GROUP BY month ORDER BY month DESC LIMIT 6
      `).all().reverse();

      const recentActivity = db.prepare(`
        SELECT m.customer_name, m.invoice_no, m.invoice_date, 'Entry' as type, n.dealer_name
        FROM master_entries m
        JOIN network_locations n ON m.location_id = n.id
        ORDER BY m.id DESC LIMIT 10
      `).all();

      return {
        insurance: { total: insTotal, pending: insPending, completed: insCompleted, today: insToday, expiring: insExpiring },
        rto: { total: rtoTotal, pending: rtoPending, completed: rtoCompleted, regPending: rtoRegPending, today: rtoToday },
        renewals: { next7: ren7, next30: ren30, expired: renExpired },
        commission: { insurance: insComm, rto: rtoComm, pending: pendComm, monthly: monthlyComm },
        monthly_trend: monthlyTrend,
        recent_activity: recentActivity
      };
    } catch (err) {
      console.error('Dashboard Stats Error:', err);
      return { insurance: {}, rto: {}, renewals: {}, commission: {}, monthly_trend: [], recent_activity: [] };
    }
  });

  // Network/Dealers
  ipcMain.handle('get-dealers', () => {
    return db.prepare('SELECT * FROM network_locations').all();
  });

  ipcMain.handle('add-dealer', (event, dealer) => {
    try {
      const stmt = db.prepare('INSERT INTO network_locations (dealer_name, dealer_type, address, mobile, gst_no, contact_person, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run(dealer.dealer_name, dealer.dealer_type, dealer.address, dealer.mobile, dealer.gst_no, dealer.contact_person, dealer.status || 'Active');
      return { success: true };
    } catch (err) {
      console.error('Add Dealer Error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('update-dealer', (event, dealer) => {
    try {
      const stmt = db.prepare(`
        UPDATE network_locations 
        SET dealer_name = ?, dealer_type = ?, address = ?, mobile = ?, 
            gst_no = ?, contact_person = ?, status = ?
        WHERE id = ?
      `);
      const result = stmt.run(dealer.dealer_name, dealer.dealer_type, dealer.address, dealer.mobile, dealer.gst_no, dealer.contact_person, dealer.status, dealer.id);
      return { success: result.changes > 0 };
    } catch (err) {
      console.error('Update Dealer Error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-dealer', (event, id) => {
    try {
      // Check if dealer has any master entries before deleting
      const entries = db.prepare('SELECT id FROM master_entries WHERE location_id = ?').get(id);
      if (entries) {
        return { success: false, error: 'Cannot delete dealer with existing transaction records.' };
      }
      const result = db.prepare('DELETE FROM network_locations WHERE id = ?').run(id);
      return { success: result.changes > 0 };
    } catch (err) {
      console.error('Delete Dealer Error:', err);
      return { success: false, error: err.message };
    }
  });

  // Master Entries Management
  ipcMain.handle('get-master-management', () => {
    return db.prepare(`
      SELECT 
        m.*, n.dealer_name,
        i.status as insurance_status, i.policy_no, i.insurance_price_list,
        r.status as rto_status, r.registration_no, r.rto_price_list
      FROM master_entries m
      LEFT JOIN network_locations n ON m.location_id = n.id
      LEFT JOIN insurance_details i ON m.id = i.master_entry_id
      LEFT JOIN rto_details r ON m.id = r.master_entry_id
      ORDER BY m.id DESC
    `).all();
  });

  ipcMain.handle('add-master-entry', (event, entry) => {
    const stmt = db.prepare(`
      INSERT INTO master_entries (s_no, location_id, invoice_no, invoice_date, customer_name, father_name, mobile_number, address, vehicle_model, vehicle_color, frame_no, engine_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(entry.s_no, entry.location_id, entry.invoice_no, entry.invoice_date, entry.customer_name, entry.father_name, entry.mobile_number, entry.address, entry.vehicle_model, entry.vehicle_color, entry.frame_no, entry.engine_no);
    
    // Create linked records
    db.prepare('INSERT INTO insurance_details (master_entry_id) VALUES (?)').run(info.lastInsertRowid);
    db.prepare('INSERT INTO rto_details (master_entry_id) VALUES (?)').run(info.lastInsertRowid);
    
    return info.lastInsertRowid;
  });

  ipcMain.handle('delete-master-entry', (event, id) => {
    try {
      db.prepare('DELETE FROM insurance_details WHERE master_entry_id = ?').run(id);
      db.prepare('DELETE FROM rto_details WHERE master_entry_id = ?').run(id);
      db.prepare('DELETE FROM agent_commissions WHERE master_entry_id = ?').run(id);
      db.prepare('DELETE FROM master_entries WHERE id = ?').run(id);
      return { success: true };
    } catch (err) {
      console.error('Delete Error:', err);
      return { success: false, error: err.message };
    }
  });

  // Insurance
  ipcMain.handle('get-insurance-details', () => {
    return db.prepare(`
      SELECT 
        i.*, 
        m.s_no, m.location_id, m.invoice_no, m.invoice_date, m.customer_name, 
        m.father_name, m.mobile_number, m.address, m.vehicle_model, 
        m.vehicle_color, m.frame_no, m.engine_no,
        n.dealer_name 
      FROM insurance_details i
      JOIN master_entries m ON i.master_entry_id = m.id
      LEFT JOIN network_locations n ON m.location_id = n.id
      ORDER BY i.id DESC
    `).all();
  });


  // RTO
  ipcMain.handle('get-rto-details', () => {
    return db.prepare(`
      SELECT 
        r.*, 
        m.s_no, m.location_id, m.invoice_no, m.invoice_date, m.customer_name, 
        m.father_name, m.mobile_number, m.address, m.vehicle_model, 
        m.vehicle_color, m.frame_no, m.engine_no,
        n.dealer_name 
      FROM rto_details r
      JOIN master_entries m ON r.master_entry_id = m.id
      LEFT JOIN network_locations n ON m.location_id = n.id
      ORDER BY r.id DESC
    `).all();
  });


  // Commission Ledger - Full Data Fetch
  ipcMain.handle('get-commissions', (event, filters = {}) => {
    let query = `
      SELECT 
        ac.id, ac.master_entry_id, ac.department_type, ac.assigned_agent,
        ac.commission_type, ac.amount, ac.status, ac.notes, ac.paid_date,
        m.invoice_date, m.invoice_no, m.customer_name, m.frame_no, m.engine_no,
        n.dealer_name, n.dealer_type
      FROM agent_commissions ac
      JOIN master_entries m ON ac.master_entry_id = m.id
      JOIN network_locations n ON m.location_id = n.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.department) {
      query += ` AND ac.department_type = ?`;
      params.push(filters.department);
    }
    if (filters.agent) {
      query += ` AND ac.assigned_agent = ?`;
      params.push(filters.agent);
    }
    if (filters.dealer) {
      query += ` AND n.dealer_name = ?`;
      params.push(filters.dealer);
    }
    if (filters.status) {
      query += ` AND ac.status = ?`;
      params.push(filters.status);
    }
    if (filters.startDate && filters.endDate) {
      query += ` AND m.invoice_date BETWEEN ? AND ?`;
      params.push(filters.startDate, filters.endDate);
    }

    query += ` ORDER BY m.invoice_date DESC, ac.id DESC`;

    return db.prepare(query).all(...params);
  });

  // Backup
  ipcMain.handle('create-backup', async () => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Database Backup',
      defaultPath: path.join(app.getPath('documents'), `badone_backup_${new Date().toISOString().split('T')[0]}.db`),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (!filePath) return { success: false, error: 'User cancelled' };

    try {
      await db.backup(filePath);
      db.prepare('INSERT INTO backup_history (backup_date, filename) VALUES (?, ?)').run(new Date().toISOString(), path.basename(filePath));
      return { success: true, file: filePath };
    } catch (err) {
      console.error('Backup error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('restore-backup', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup File to Restore',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    });

    if (!filePaths || filePaths.length === 0) return { success: false, error: 'User cancelled' };

    const backupPath = filePaths[0];
    const dbPath = path.join(app.getPath('userData'), 'badone_erp.db');

    try {
      const { closeDatabase, initDatabase } = require('./database');
      closeDatabase();
      
      // Copy the backup file to replace the current DB
      fs.copyFileSync(backupPath, dbPath);
      
      // Re-initialize the DB
      initDatabase(app.getPath('userData'));
      
      // We should probably tell the app to reload or just return success
      // The renderer can reload the page
      return { success: true };
    } catch (err) {
      console.error('Restore error:', err);
      // Try to re-open the DB even if copy failed
      try { require('./database').initDatabase(app.getPath('userData')); } catch(e) {}
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-backup-history', () => {
    return db.prepare('SELECT * FROM backup_history ORDER BY id DESC LIMIT 50').all();
  });

  // Document Upload
  ipcMain.handle('upload-document', async (event, { type, entryId, filePath }) => {
    const docsDir = path.join(app.getPath('userData'), 'documents', type);
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

    const fileName = path.basename(filePath);
    const destPath = path.join(docsDir, `${Date.now()}_${fileName}`);
    fs.copyFileSync(filePath, destPath);

    if (type === 'insurance') {
      db.prepare('UPDATE insurance_details SET document_path = ?, document_name = ?, document_upload_date = ? WHERE id = ?')
        .run(destPath, fileName, new Date().toISOString(), entryId);
    } else {
      db.prepare('UPDATE rto_details SET document_path = ?, document_name = ?, document_upload_date = ? WHERE id = ?')
        .run(destPath, fileName, new Date().toISOString(), entryId);
    }
    return { success: true, path: destPath, name: fileName };
  });

  ipcMain.handle('sync-commissions', () => {
    try {
      const allEntries = db.prepare(`
        SELECT 
          m.id as master_entry_id, m.invoice_no, m.customer_name,
          n.dealer_type,
          IFNULL(i.insurance_difference, 0) as insurance_difference, 
          IFNULL(i.status, 'Pending') as insurance_status,
          IFNULL(r.rto_difference, 0) as rto_difference, 
          IFNULL(r.status, 'Pending') as rto_status
        FROM master_entries m
        LEFT JOIN network_locations n ON m.location_id = n.id
        LEFT JOIN insurance_details i ON m.id = i.master_entry_id
        LEFT JOIN rto_details r ON m.id = r.master_entry_id
      `).all();

      let syncedCount = 0;
      for (const entry of allEntries) {
        const isMainDealer = entry.dealer_type && 
          entry.dealer_type.trim().toLowerCase() === 'main dealer';

        // Insurance Commission Sync
        if (isMainDealer) {
          const existingIns = db.prepare("SELECT id FROM agent_commissions WHERE master_entry_id = ? AND department_type = 'Insurance'").get(entry.master_entry_id);
          const note = `Insurance Difference for ${entry.customer_name} | Inv: ${entry.invoice_no}`;
          
          if (!existingIns) {
            db.prepare("INSERT INTO agent_commissions (master_entry_id, department_type, assigned_agent, commission_type, amount, status, notes) VALUES (?, 'Insurance', 'TEERTH BADONE', 'Insurance Difference', ?, ?, ?)")
              .run(entry.master_entry_id, entry.insurance_difference, entry.insurance_status, note);
            syncedCount++;
          } else {
            db.prepare("UPDATE agent_commissions SET amount = ?, status = ?, notes = ?, assigned_agent = 'TEERTH BADONE', commission_type = 'Insurance Difference' WHERE id = ?")
              .run(entry.insurance_difference, entry.insurance_status, note, existingIns.id);
          }
        } else {
          db.prepare("DELETE FROM agent_commissions WHERE master_entry_id = ? AND department_type = 'Insurance'").run(entry.master_entry_id);
        }

        // RTO Commission Sync
        if (isMainDealer) {
          const existingRto = db.prepare("SELECT id FROM agent_commissions WHERE master_entry_id = ? AND department_type = 'RTO'").get(entry.master_entry_id);
          const note = `RTO Difference for ${entry.customer_name} | Inv: ${entry.invoice_no}`;
          
          if (!existingRto) {
            db.prepare("INSERT INTO agent_commissions (master_entry_id, department_type, assigned_agent, commission_type, amount, status, notes) VALUES (?, 'RTO', 'VASU BADONE', 'RTO Difference', ?, ?, ?)")
              .run(entry.master_entry_id, entry.rto_difference, entry.rto_status, note);
            syncedCount++;
          } else {
            db.prepare("UPDATE agent_commissions SET amount = ?, status = ?, notes = ?, assigned_agent = 'VASU BADONE', commission_type = 'RTO Difference' WHERE id = ?")
              .run(entry.rto_difference, entry.rto_status, note, existingRto.id);
          }
        } else {
          db.prepare("DELETE FROM agent_commissions WHERE master_entry_id = ? AND department_type = 'RTO'").run(entry.master_entry_id);
        }
      }
      return { 
        success: true, 
        count: syncedCount, 
        totalEntries: allEntries.length,
        mainDealers: allEntries.filter(e => e.dealer_type && e.dealer_type.trim().toLowerCase() === 'main dealer').length
      };
    } catch (error) {
      console.error('Sync Commissions Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-master-entry', (event, entry) => {
    try {
      const stmt = db.prepare(`
        UPDATE master_entries 
        SET s_no = ?, location_id = ?, invoice_no = ?, invoice_date = ?, 
            customer_name = ?, father_name = ?, mobile_number = ?, 
            address = ?, vehicle_model = ?, vehicle_color = ?, 
            frame_no = ?, engine_no = ?
        WHERE id = ?
      `);
      stmt.run(
        entry.s_no, entry.location_id, entry.invoice_no, entry.invoice_date, 
        entry.customer_name, entry.father_name, entry.mobile_number, 
        entry.address, entry.vehicle_model, entry.vehicle_color, 
        entry.frame_no, entry.engine_no, entry.id
      );

      return { success: true };
    } catch (err) {
      console.error('Update Master Error:', err);
      return { success: false, error: err.message };
    }
  });

  // =========================================================================
  // ===================== DEALER PAYMENT LEDGER SYSTEM ======================
  // =========================================================================

  // Helper: Update running balance for a dealer/department (PRODUCTION OPTIMIZED)
  function updateDealerBalance(dealerId, departmentType) {
    // Get the most recent transaction balance before the current ones
    const lastTx = db.prepare(`
      SELECT running_balance FROM dealer_transactions 
      WHERE dealer_id = ? AND department_type = ? 
      ORDER BY created_at DESC, id DESC LIMIT 1
    `).get(dealerId, departmentType);

    const currentBalance = lastTx ? lastTx.running_balance : 0;

    // Update main ledger summary table for instant dashboard lookups
    db.prepare(`
      INSERT INTO dealer_payment_ledgers (dealer_id, department_type, current_balance)
      VALUES (?, ?, ?)
      ON CONFLICT(dealer_id, department_type) DO UPDATE SET current_balance = excluded.current_balance
    `).run(dealerId, departmentType, currentBalance);

    return currentBalance;
  }

  // Helper: Add Ledger Entry (ATOMIC TRANSACTIONAL)
  const addLedgerEntry = db.transaction(({ dealerId, departmentType, transactionType, amount, debit, credit, notes, masterEntryId = null, date = null }) => {
    const createdAt = date || new Date().toISOString();
    
    // 1. Get the current running balance
    const lastBalance = (db.prepare(`
      SELECT running_balance FROM dealer_transactions 
      WHERE dealer_id = ? AND department_type = ? 
      ORDER BY created_at DESC, id DESC LIMIT 1
    `).get(dealerId, departmentType) || { running_balance: 0 }).running_balance;

    const newBalance = lastBalance + (debit || 0) - (credit || 0);

    // 2. Insert the new transaction with the pre-calculated balance
    db.prepare(`
      INSERT INTO dealer_transactions 
      (dealer_id, department_type, transaction_type, amount, debit, credit, notes, master_entry_id, created_at, running_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(dealerId, departmentType, transactionType, amount, debit || 0, credit || 0, notes, masterEntryId, createdAt, newBalance);

    // 3. Sync the summary ledger
    db.prepare(`
      INSERT INTO dealer_payment_ledgers (dealer_id, department_type, current_balance)
      VALUES (?, ?, ?)
      ON CONFLICT(dealer_id, department_type) DO UPDATE SET current_balance = excluded.current_balance
    `).run(dealerId, departmentType, newBalance);

    return newBalance;
  });

  ipcMain.handle('get-dealer-ledgers', (event) => {
    try {
      // Get ALL dealers to ensure none are hidden from the financial overview
      const dealers = db.prepare('SELECT id, dealer_name, dealer_type, mobile FROM network_locations').all();
      const now = new Date();
      const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
      const yearStr = now.getFullYear().toString();
      const datePrefix = `${yearStr}-${monthStr}%`;

      return dealers.map(dealer => {
        // Get Opening Balance
        const opening = (db.prepare(`
          SELECT opening_balance FROM dealer_monthly_balances 
          WHERE dealer_id = ? AND month = ? AND year = ?
        `).get(dealer.id, now.getMonth() + 1, now.getFullYear()) || { opening_balance: 0 }).opening_balance;

        // Get monthly totals using LIKE for robust date matching with ISO strings
        const totals = db.prepare(`
          SELECT 
            SUM(debit) as total_debit,
            SUM(credit) as total_credit
          FROM dealer_transactions
          WHERE dealer_id = ? AND created_at LIKE ?
        `).get(dealer.id, datePrefix);

        const debit = totals.total_debit || 0;
        const credit = totals.total_credit || 0;
        
        const lastPayment = db.prepare(`
          SELECT created_at FROM dealer_transactions 
          WHERE dealer_id = ? AND transaction_type = 'Payment'
          ORDER BY created_at DESC LIMIT 1
        `).get(dealer.id);

        return {
          id: dealer.id,
          dealer_name: dealer.dealer_name,
          dealer_type: dealer.dealer_type || 'General',
          mobile: dealer.mobile,
          opening_balance: opening,
          total_debit: debit,
          total_credit: credit,
          total_outstanding: opening + debit - credit,
          last_payment_date: lastPayment ? lastPayment.created_at.split('T')[0] : 'No payments'
        };
      }).filter(d => d.total_debit > 0 || d.total_credit > 0 || d.opening_balance !== 0); // Only show dealers with financial activity
    } catch (err) {
      console.error('Get Dealer Ledgers Error:', err);
      return [];
    }
  });

  ipcMain.handle('get-dealer-transactions', (event, filters = {}) => {
    let query = `
      SELECT 
        t.*, n.dealer_name, n.dealer_type,
        m.customer_name, m.invoice_no
      FROM dealer_transactions t
      JOIN network_locations n ON t.dealer_id = n.id
      LEFT JOIN master_entries m ON t.master_entry_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.dealerId) {
      query += ` AND t.dealer_id = ?`;
      params.push(filters.dealerId);
    }
    if (filters.departmentType) {
      query += ` AND t.department_type = ?`;
      params.push(filters.departmentType);
    }
    if (filters.startDate && filters.endDate) {
      query += ` AND t.created_at BETWEEN ? AND ?`;
      params.push(filters.startDate, filters.endDate);
    }

    query += ` ORDER BY t.created_at DESC, t.id DESC`;
    return db.prepare(query).all(...params);
  });

  ipcMain.handle('add-dealer-payment', (event, payment) => {
    try {
      const dealerId = parseInt(payment.dealer_id, 10);
      if (!dealerId || !payment.amount || !payment.department_type) {
        return { success: false, error: 'Missing required fields: dealer, amount, or department.' };
      }
      const amount = parseFloat(payment.amount);
      if (isNaN(amount) || amount <= 0) {
        return { success: false, error: 'Invalid amount.' };
      }

      // Build a proper ISO timestamp from the date string (e.g. "2026-05-10")
      const createdAt = payment.date 
        ? new Date(payment.date).toISOString() 
        : new Date().toISOString();

      const notes = `${payment.payment_mode || 'Cash'} Payment${payment.notes ? ': ' + payment.notes : ''}`;

      addLedgerEntry({
        dealerId,
        departmentType: payment.department_type,
        transactionType: 'Payment',
        amount,
        credit: amount,
        debit: 0,
        notes,
        date: createdAt
      });

      return { success: true };
    } catch (err) {
      console.error('Add Payment Error:', err);
      return { success: false, error: err.message };
    }
  });

  // Helper: Recalculate Ledger (SEQUENTIAL REPAIR)
  const recalculateDealerLedger = db.transaction((dealerId, departmentType) => {
    const txs = db.prepare(`
      SELECT id, debit, credit FROM dealer_transactions 
      WHERE dealer_id = ? AND department_type = ? 
      ORDER BY created_at ASC, id ASC
    `).all(dealerId, departmentType);

    let currentBalance = 0;
    for (const tx of txs) {
      currentBalance += tx.debit - tx.credit;
      db.prepare('UPDATE dealer_transactions SET running_balance = ? WHERE id = ?').run(currentBalance, tx.id);
    }

    db.prepare(`
      INSERT INTO dealer_payment_ledgers (dealer_id, department_type, current_balance)
      VALUES (?, ?, ?)
      ON CONFLICT(dealer_id, department_type) DO UPDATE SET current_balance = excluded.current_balance
    `).run(dealerId, departmentType, currentBalance);

    return currentBalance;
  });

  ipcMain.handle('delete-dealer-transaction', async (event, transactionId) => {
    try {
      const tx = db.prepare('SELECT dealer_id, department_type FROM dealer_transactions WHERE id = ?').get(transactionId);
      if (!tx) return { success: false, error: 'Transaction not found.' };

      db.prepare('DELETE FROM dealer_transactions WHERE id = ?').run(transactionId);
      
      // Recalculate everything for this dealer/dept to ensure running balances are perfect
      recalculateDealerLedger(tx.dealer_id, tx.department_type);
      
      return { success: true };
    } catch (err) {
      console.error('Delete Transaction Error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-ledger-dashboard-stats', () => {
    try {
      const stats = {
        totalReceivable: (db.prepare("SELECT SUM(current_balance) as total FROM dealer_payment_ledgers WHERE current_balance > 0").get() || { total: 0 }).total || 0,
        totalReceived: (db.prepare("SELECT SUM(credit) as total FROM dealer_transactions WHERE transaction_type = 'Payment'").get() || { total: 0 }).total || 0,
        pendingASC: (db.prepare(`
          SELECT SUM(l.current_balance) as total 
          FROM dealer_payment_ledgers l
          JOIN network_locations n ON l.dealer_id = n.id
          WHERE n.dealer_type LIKE '%ASC%' AND l.current_balance > 0
        `).get() || { total: 0 }).total || 0,
        pendingFO: (db.prepare(`
          SELECT SUM(l.current_balance) as total 
          FROM dealer_payment_ledgers l
          JOIN network_locations n ON l.dealer_id = n.id
          WHERE n.dealer_type LIKE '%FO%' AND l.current_balance > 0
        `).get() || { total: 0 }).total || 0,
        insuranceReceivable: (db.prepare("SELECT SUM(current_balance) as total FROM dealer_payment_ledgers WHERE department_type = 'Insurance' AND current_balance > 0").get() || { total: 0 }).total || 0,
        rtoReceivable: (db.prepare("SELECT SUM(current_balance) as total FROM dealer_payment_ledgers WHERE department_type = 'RTO' AND current_balance > 0").get() || { total: 0 }).total || 0
      };
      return stats;
    } catch (err) {
      console.error('Ledger Stats Error:', err);
      return {};
    }
  });

  ipcMain.handle('process-monthly-closing', (event, { month, year }) => {
    try {
      const dealers = db.prepare('SELECT id FROM network_locations').all();
      const depts = ['Insurance', 'RTO'];

      for (const dealer of dealers) {
        for (const dept of depts) {
          const ledger = db.prepare('SELECT current_balance FROM dealer_payment_ledgers WHERE dealer_id = ? AND department_type = ?').get(dealer.id, dept);
          const closingBalance = ledger ? ledger.current_balance : 0;

          // Record monthly balance
          db.prepare(`
            INSERT INTO dealer_monthly_balances (dealer_id, department_type, month, year, closing_balance)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(dealer_id, department_type, month, year) DO UPDATE SET closing_balance = excluded.closing_balance
          `).run(dealer.id, dept, month, year, closingBalance);

          // Prepare opening balance for next month
          let nextMonth = month + 1;
          let nextYear = year;
          if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
          }

          db.prepare(`
            INSERT INTO dealer_monthly_balances (dealer_id, department_type, month, year, opening_balance)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(dealer_id, department_type, month, year) DO UPDATE SET opening_balance = excluded.opening_balance
          `).run(dealer.id, dept, nextMonth, nextYear, closingBalance);
        }
      }
      return { success: true };
    } catch (err) {
      console.error('Monthly Closing Error:', err);
      return { success: false, error: err.message };
    }
  });

  // Re-define update-insurance with ledger logic
  ipcMain.removeHandler('update-insurance');
  ipcMain.handle('update-insurance', (event, data) => {
    try {
      if (!data.id) throw new Error('Record ID is missing');
      
      const pl     = parseFloat(data.insurance_price_list)    || 0;
      const actual = parseFloat(data.insurance_actual_deducted) || 0;
      const penalty = parseFloat(data.penalty_charges)        || 0;
      const diff   = pl - (actual + penalty);

      let status = 'Pending';
      if (data.policy_no || pl > 0) status = 'In Process';
      if (data.policy_no && pl > 0 && actual > 0) status = 'Completed';

      db.prepare(`
        UPDATE insurance_details 
        SET policy_no = ?, insurance_price_list = ?, insurance_actual_deducted = ?, 
            insurance_difference = ?, penalty_charges = ?, status = ?,
            policy_start_date = ?, policy_expiry_date = ?, insurance_deducted_date = ?,
            zero_def = ?, third_party = ?
        WHERE id = ?
      `).run(
        data.policy_no, pl, actual, diff, penalty, status,
        data.policy_start_date, data.policy_expiry_date, data.insurance_deducted_date,
        data.zero_def ? 1 : 0, data.third_party ? 1 : 0,
        data.id
      );

      const fullEntry = db.prepare(`
        SELECT 
          m.id as master_entry_id, m.invoice_no, m.invoice_date, m.customer_name, m.location_id,
          n.dealer_type, n.dealer_name
        FROM insurance_details i
        JOIN master_entries m ON i.master_entry_id = m.id
        JOIN network_locations n ON m.location_id = n.id
        WHERE i.id = ?
      `).get(data.id);

      if (fullEntry) {
        const dType = (fullEntry.dealer_type || '').trim().toUpperCase();
        const isMainDealer = dType === 'MAIN DEALER';
        const isLedgerDealer = dType.includes('ASC') || dType.includes('FO');

        // Main Dealer -> Commission
        if (isMainDealer) {
          const commissionNote = `Insurance Difference for ${fullEntry.customer_name} | Inv: ${fullEntry.invoice_no}`;
          const existing = db.prepare("SELECT id FROM agent_commissions WHERE master_entry_id = ? AND department_type = 'Insurance'").get(fullEntry.master_entry_id);
          if (existing) {
            db.prepare(`UPDATE agent_commissions SET amount = ?, status = ?, notes = ? WHERE id = ?`).run(diff, status, commissionNote, existing.id);
          } else {
            db.prepare(`INSERT INTO agent_commissions (master_entry_id, department_type, assigned_agent, commission_type, amount, status, notes) VALUES (?, 'Insurance', 'TEERTH BADONE', 'Insurance Difference', ?, ?, ?)`).run(fullEntry.master_entry_id, diff, status, commissionNote);
          }
        }

        // ASC/FO -> Ledger Receivable
        if (isLedgerDealer && status === 'Completed') {
          // Check if already in ledger
          const existingLedger = db.prepare("SELECT id FROM dealer_transactions WHERE master_entry_id = ? AND department_type = 'Insurance' AND transaction_type = 'Receivable'").get(fullEntry.master_entry_id);
          if (!existingLedger) {
            addLedgerEntry({
              dealerId: fullEntry.location_id,
              departmentType: 'Insurance',
              transactionType: 'Receivable',
              amount: pl,
              debit: pl,
              notes: `Insurance Work: ${fullEntry.customer_name} | Inv: ${fullEntry.invoice_no}`,
              masterEntryId: fullEntry.master_entry_id,
              date: data.insurance_deducted_date || new Date().toISOString()
            });
          }
        }
      }
      return { success: true };
    } catch (error) {
      console.error('Update Insurance Error:', error);
      return { success: false, error: error.message };
    }
  });

  // Re-define update-rto with ledger logic
  ipcMain.removeHandler('update-rto');
  ipcMain.handle('update-rto', (event, data) => {
    try {
      if (!data.id) throw new Error('Record ID is missing');
      const pl      = parseFloat(data.rto_price_list)       || 0;
      const actual  = parseFloat(data.rto_actual_deducted)  || 0;
      const vid     = parseFloat(data.vid_feeding_charge)   || 0;
      const penalty = parseFloat(data.penalty_charges)      || 0;
      const diff    = pl - (actual + vid + penalty);

      let status = 'Pending';
      if (data.registration_no || pl > 0) status = 'In Process';
      if (data.registration_no && pl > 0 && actual > 0) status = 'Completed';

      db.prepare(`
        UPDATE rto_details 
        SET registration_no = ?, rto_price_list = ?, rto_actual_deducted = ?, 
            rto_difference = ?, vid_feeding_charge = ?, penalty_charges = ?, 
            status = ?, rto_deducted_date = ?
        WHERE id = ?
      `).run(data.registration_no, pl, actual, diff, vid, penalty, status, data.rto_deducted_date, data.id);

      const fullEntry = db.prepare(`
        SELECT 
          m.id as master_entry_id, m.invoice_no, m.invoice_date, m.customer_name, m.location_id,
          n.dealer_type, n.dealer_name
        FROM rto_details r
        JOIN master_entries m ON r.master_entry_id = m.id
        JOIN network_locations n ON m.location_id = n.id
        WHERE r.id = ?
      `).get(data.id);

      if (fullEntry) {
        const dType = (fullEntry.dealer_type || '').trim().toUpperCase();
        const isMainDealer = dType === 'MAIN DEALER';
        const isLedgerDealer = dType.includes('ASC') || dType.includes('FO');

        if (isMainDealer) {
          const commissionNote = `RTO Difference for ${fullEntry.customer_name} | Inv: ${fullEntry.invoice_no}`;
          const existing = db.prepare("SELECT id FROM agent_commissions WHERE master_entry_id = ? AND department_type = 'RTO'").get(fullEntry.master_entry_id);
          if (existing) {
            db.prepare(`UPDATE agent_commissions SET amount = ?, status = ?, notes = ? WHERE id = ?`).run(diff, status, commissionNote, existing.id);
          } else {
            db.prepare(`INSERT INTO agent_commissions (master_entry_id, department_type, assigned_agent, commission_type, amount, status, notes) VALUES (?, 'RTO', 'VASU BADONE', 'RTO Difference', ?, ?, ?)`).run(fullEntry.master_entry_id, diff, status, commissionNote);
          }
        }

        if (isLedgerDealer && status === 'Completed') {
          const existingLedger = db.prepare("SELECT id FROM dealer_transactions WHERE master_entry_id = ? AND department_type = 'RTO' AND transaction_type = 'Receivable'").get(fullEntry.master_entry_id);
          if (!existingLedger) {
            addLedgerEntry({
              dealerId: fullEntry.location_id,
              departmentType: 'RTO',
              transactionType: 'Receivable',
              amount: pl,
              debit: pl,
              notes: `RTO Work: ${fullEntry.customer_name} | Inv: ${fullEntry.invoice_no}`,
              masterEntryId: fullEntry.master_entry_id,
              date: data.rto_deducted_date || new Date().toISOString()
            });
          }
        }
      }
      return { success: true };
    } catch (error) {
      console.error('Update RTO Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('factory-reset', async () => {
    try {
      // Use exec for immediate pragma application
      db.exec('PRAGMA foreign_keys = OFF');
      
      const tables = [
        'insurance_details',
        'rto_details',
        'agent_commissions',
        'dealer_transactions',
        'dealer_payment_ledgers',
        'dealer_monthly_balances',
        'master_entries',
        'network_locations',
        'backup_history'
      ];

      db.transaction(() => {
        for (const table of tables) {
          try {
            db.prepare(`DELETE FROM ${table}`).run();
            // Reset autoincrement counters
            db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(table);
          } catch (e) {
            console.warn(`Could not clear table ${table}:`, e.message);
          }
        }
      })();

      db.exec('PRAGMA foreign_keys = ON');
      
      // Physically shrink the DB file to zero out the space
      db.exec('VACUUM');
      
      return { success: true };
    } catch (err) {
      console.error('Factory Reset Error:', err);
      db.exec('PRAGMA foreign_keys = ON');
      return { success: false, error: err.message };
    }
  });

}

module.exports = { setupIpcHandlers };
