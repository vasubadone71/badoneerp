-- VPS Cloud ERP Database Schema (Converted from SQLite)

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  machine_id VARCHAR(255),
  auto_backup BOOLEAN DEFAULT 1,
  company_name VARCHAR(255),
  address TEXT,
  gst VARCHAR(100),
  contact_info VARCHAR(255),
  last_backup_time DATETIME,
  logo_base64 LONGTEXT,
  database_path VARCHAR(500),
  documents_path VARCHAR(500),
  backup_path VARCHAR(500),
  exports_path VARCHAR(500),
  logs_path VARCHAR(500),
  network_database_path VARCHAR(500),
  network_documents_path VARCHAR(500),
  network_backup_path VARCHAR(500),
  network_exports_path VARCHAR(500),
  network_logs_path VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS dealer_network (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dealer_name VARCHAR(255) NOT NULL,
  dealer_type VARCHAR(100) NOT NULL,
  address TEXT,
  mobile VARCHAR(50),
  gst_no VARCHAR(100),
  contact_person VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS master_processing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  s_no VARCHAR(100),
  location_id INT,
  invoice_no VARCHAR(100),
  invoice_date DATE,
  customer_name VARCHAR(255),
  father_name VARCHAR(255),
  mobile_number VARCHAR(50),
  address TEXT,
  vehicle_model VARCHAR(255),
  vehicle_color VARCHAR(100),
  frame_no VARCHAR(100),
  engine_no VARCHAR(100),
  FOREIGN KEY (location_id) REFERENCES dealer_network(id),
  INDEX idx_master_invoice (invoice_no),
  INDEX idx_master_frame (frame_no)
);

CREATE TABLE IF NOT EXISTS insurance_department (
  id INT AUTO_INCREMENT PRIMARY KEY,
  master_entry_id INT,
  policy_no VARCHAR(255),
  insurance_company VARCHAR(255),
  insurance_price_list DECIMAL(10, 2) DEFAULT 0,
  insurance_actual_deducted DECIMAL(10, 2) DEFAULT 0,
  insurance_difference DECIMAL(10, 2) DEFAULT 0,
  penalty_charges DECIMAL(10, 2) DEFAULT 0,
  policy_start_date DATE,
  policy_expiry_date DATE,
  insurance_deducted_date DATE,
  zero_def BOOLEAN DEFAULT 0,
  third_party BOOLEAN DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Pending',
  remarks TEXT,
  document_path VARCHAR(500),
  document_name VARCHAR(255),
  document_upload_date DATETIME,
  FOREIGN KEY (master_entry_id) REFERENCES master_processing(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rto_department (
  id INT AUTO_INCREMENT PRIMARY KEY,
  master_entry_id INT,
  registration_no VARCHAR(100),
  rto_price_list DECIMAL(10, 2) DEFAULT 0,
  rto_actual_deducted DECIMAL(10, 2) DEFAULT 0,
  rto_difference DECIMAL(10, 2) DEFAULT 0,
  vid_feeding_charge DECIMAL(10, 2) DEFAULT 0,
  penalty_charges DECIMAL(10, 2) DEFAULT 0,
  rto_deducted_date DATE,
  status VARCHAR(50) DEFAULT 'Pending',
  remarks TEXT,
  document_path VARCHAR(500),
  document_name VARCHAR(255),
  document_upload_date DATETIME,
  FOREIGN KEY (master_entry_id) REFERENCES master_processing(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_ledgers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  master_entry_id INT,
  department_type VARCHAR(100),
  assigned_agent VARCHAR(255),
  commission_type VARCHAR(100),
  amount DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Pending',
  notes TEXT,
  paid_date DATETIME,
  source_id INT NULL,
  source_type VARCHAR(50) NULL,
  auto_generated BOOLEAN DEFAULT 0,
  FOREIGN KEY (master_entry_id) REFERENCES master_processing(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dealer_ledgers_payment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dealer_id INT,
  department_type VARCHAR(100), -- 'Insurance' or 'RTO'
  current_balance DECIMAL(15, 2) DEFAULT 0,
  UNIQUE(dealer_id, department_type),
  FOREIGN KEY (dealer_id) REFERENCES dealer_network(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dealer_ledgers_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dealer_id INT,
  department_type VARCHAR(100), -- 'Insurance' or 'RTO'
  transaction_type VARCHAR(100), -- 'Receivable' or 'Payment'
  master_entry_id INT NULL,
  amount DECIMAL(15, 2) DEFAULT 0,
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  running_balance DECIMAL(15, 2) DEFAULT 0,
  payment_mode VARCHAR(100),
  notes TEXT,
  created_at DATETIME,
  FOREIGN KEY (dealer_id) REFERENCES dealer_network(id) ON DELETE CASCADE,
  FOREIGN KEY (master_entry_id) REFERENCES master_processing(id) ON DELETE SET NULL,
  INDEX idx_trans_dealer_date (dealer_id, created_at)
);

CREATE TABLE IF NOT EXISTS dealer_ledgers_monthly (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dealer_id INT,
  department_type VARCHAR(100),
  month INT,
  year INT,
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  closing_balance DECIMAL(15, 2) DEFAULT 0,
  UNIQUE(dealer_id, department_type, month, year),
  FOREIGN KEY (dealer_id) REFERENCES dealer_network(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS backup_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  backup_date DATETIME,
  filename VARCHAR(255)
);

-- New tables for VPS Migration
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(100) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_date DATETIME,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_no VARCHAR(100),
  amount DECIMAL(15, 2),
  payment_date DATETIME,
  payment_method VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_name VARCHAR(255),
  original_name VARCHAR(255),
  file_path VARCHAR(500),
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

