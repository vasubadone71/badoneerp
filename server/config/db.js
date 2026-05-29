const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true // Required for running init.sql
});

// We need a separate connection without database selected to create it if it doesn't exist
const initialPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('[DB] Connected to MySQL database.');
    connection.release();
  } catch (error) {
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log(`[DB] Database '${process.env.DB_NAME}' does not exist. Will create it.`);
      return;
    }
    console.error('[DB] Connection failed:', error.message);
    throw error;
  }
}

async function initializeDatabase() {
  try {
    // 1. Create database if not exists
    const conn = await initialPool.getConnection();
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    conn.release();

    // 2. Read init.sql
    const sqlPath = path.join(__dirname, 'init.sql');
    if (!fs.existsSync(sqlPath)) {
        console.log('[DB] init.sql not found, skipping schema initialization.');
        return;
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 3. Execute init.sql
    const dbConn = await pool.getConnection();
    console.log('[DB] Initializing database schema...');
    await dbConn.query(sql);
    console.log('[DB] Database schema initialized successfully.');

    // Database Migrations (Run every time)
    try {
      await dbConn.query(`ALTER TABLE agent_ledgers ADD COLUMN source_id INT NULL`);
      await dbConn.query(`ALTER TABLE agent_ledgers ADD COLUMN source_type VARCHAR(50) NULL`);
      await dbConn.query(`ALTER TABLE agent_ledgers ADD COLUMN auto_generated BOOLEAN DEFAULT 0`);
      console.log('[DB] Migration: Added source_id, source_type to agent_ledgers.');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('[DB] Migration Error (agent_ledgers):', e);
      }
    }

    try {
      await dbConn.query(`ALTER TABLE insurance_department ADD COLUMN agent_commission DECIMAL(10, 2) DEFAULT 0`);
      console.log('[DB] Migration: Added agent_commission to insurance_department.');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('[DB] Migration Error (insurance_department):', e);
      }
    }

    try {
      await dbConn.query(`ALTER TABLE rto_department ADD COLUMN agent_commission DECIMAL(10, 2) DEFAULT 0`);
      console.log('[DB] Migration: Added agent_commission to rto_department.');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('[DB] Migration Error (rto_department):', e);
      }
    }

    // 4. Seed default user if not exists
    const bcrypt = require('bcryptjs');
    const [users] = await dbConn.query('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('[DB] Seeding default admin user...');
      const defaultUsername = 'badonemotors';
      const defaultPassword = 'Honda@1699';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(defaultPassword, salt);
      
      await dbConn.query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [defaultUsername, hash, 'admin']
      );
      console.log('[DB] Default admin user created successfully.');
    }

    dbConn.release();
  } catch (error) {
    console.error('[DB] Schema initialization failed:', error);
    throw error;
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};
