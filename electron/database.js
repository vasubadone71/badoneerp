const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function initDatabase(userDataPath) {
  const dbPath = path.join(userDataPath, 'badone_erp.db');
  
  db = new Database(dbPath);
  
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  // Enable Foreign Key enforcement (not enabled by default in SQLite)
  db.pragma('foreign_keys = ON');
  // Set synchronous to NORMAL for faster writes while maintaining safety in WAL mode
  db.pragma('synchronous = NORMAL');
  // Set cache size for better performance with large data
  db.pragma('cache_size = -64000'); // 64MB cache

  createTables();
  createIndexes();
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id TEXT,
      auto_backup BOOLEAN DEFAULT 1,
      company_name TEXT,
      address TEXT,
      gst TEXT,
      contact_info TEXT,
      last_backup_time TEXT
    );

    CREATE TABLE IF NOT EXISTS network_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_name TEXT NOT NULL,
      dealer_type TEXT NOT NULL,
      address TEXT,
      mobile TEXT,
      gst_no TEXT,
      contact_person TEXT,
      status TEXT DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS master_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      s_no TEXT,
      location_id INTEGER,
      invoice_no TEXT,
      invoice_date TEXT,
      customer_name TEXT,
      father_name TEXT,
      mobile_number TEXT,
      address TEXT,
      vehicle_model TEXT,
      vehicle_color TEXT,
      frame_no TEXT,
      engine_no TEXT,
      FOREIGN KEY (location_id) REFERENCES network_locations(id)
    );

    CREATE TABLE IF NOT EXISTS insurance_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      master_entry_id INTEGER,
      policy_no TEXT,
      insurance_price_list REAL DEFAULT 0,
      insurance_actual_deducted REAL DEFAULT 0,
      insurance_difference REAL DEFAULT 0,
      penalty_charges REAL DEFAULT 0,
      policy_start_date TEXT,
      policy_expiry_date TEXT,
      insurance_deducted_date TEXT,
      zero_def BOOLEAN DEFAULT 0,
      third_party BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      document_path TEXT,
      document_name TEXT,
      document_upload_date TEXT,
      FOREIGN KEY (master_entry_id) REFERENCES master_entries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rto_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      master_entry_id INTEGER,
      registration_no TEXT,
      rto_price_list REAL DEFAULT 0,
      rto_actual_deducted REAL DEFAULT 0,
      rto_difference REAL DEFAULT 0,
      vid_feeding_charge REAL DEFAULT 0,
      penalty_charges REAL DEFAULT 0,
      rto_deducted_date TEXT,
      status TEXT DEFAULT 'Pending',
      document_path TEXT,
      document_name TEXT,
      document_upload_date TEXT,
      FOREIGN KEY (master_entry_id) REFERENCES master_entries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      master_entry_id INTEGER,
      department_type TEXT,
      assigned_agent TEXT,
      commission_type TEXT,
      amount REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      notes TEXT,
      paid_date TEXT,
      FOREIGN KEY (master_entry_id) REFERENCES master_entries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dealer_payment_ledgers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_id INTEGER,
      department_type TEXT, -- 'Insurance' or 'RTO'
      current_balance REAL DEFAULT 0,
      UNIQUE(dealer_id, department_type),
      FOREIGN KEY (dealer_id) REFERENCES network_locations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dealer_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_id INTEGER,
      department_type TEXT, -- 'Insurance' or 'RTO'
      transaction_type TEXT, -- 'Receivable' or 'Payment'
      master_entry_id INTEGER NULL, -- Optional link to specific work
      amount REAL DEFAULT 0,
      debit REAL DEFAULT 0, -- Amount we get (Work done)
      credit REAL DEFAULT 0, -- Amount received (Payment)
      running_balance REAL DEFAULT 0,
      payment_mode TEXT,
      notes TEXT,
      created_at TEXT,
      FOREIGN KEY (dealer_id) REFERENCES network_locations(id) ON DELETE CASCADE,
      FOREIGN KEY (master_entry_id) REFERENCES master_entries(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS dealer_monthly_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_id INTEGER,
      department_type TEXT,
      month INTEGER,
      year INTEGER,
      opening_balance REAL DEFAULT 0,
      closing_balance REAL DEFAULT 0,
      UNIQUE(dealer_id, department_type, month, year),
      FOREIGN KEY (dealer_id) REFERENCES network_locations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS backup_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_date TEXT,
      filename TEXT
    );
  `);
}

function createIndexes() {
  db.exec(`
    -- Master Entries Indexes for fast searching by Invoice or Frame
    CREATE INDEX IF NOT EXISTS idx_master_invoice ON master_entries(invoice_no);
    CREATE INDEX IF NOT EXISTS idx_master_frame ON master_entries(frame_no);
    CREATE INDEX IF NOT EXISTS idx_master_customer ON master_entries(customer_name);
    
    -- Transaction Indexes for Ledger Performance
    CREATE INDEX IF NOT EXISTS idx_trans_dealer_date ON dealer_transactions(dealer_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_trans_type ON dealer_transactions(transaction_type);
    
    -- Monthly Balance lookup optimization
    CREATE INDEX IF NOT EXISTS idx_monthly_lookup ON dealer_monthly_balances(dealer_id, month, year);
    
    -- Insurance/RTO lookups
    CREATE INDEX IF NOT EXISTS idx_insurance_master ON insurance_details(master_entry_id);
    CREATE INDEX IF NOT EXISTS idx_rto_master ON rto_details(master_entry_id);
    CREATE INDEX IF NOT EXISTS idx_insurance_status ON insurance_details(status);
    CREATE INDEX IF NOT EXISTS idx_rto_status ON rto_details(status);
  `);
}

function getDb() {
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase
};
