require('dotenv').config();
const { pool } = require('./config/db');

async function syncOldData() {
  try {
    console.log('Starting migration to sync old master_processing records into number_plate_orders...');

    // Create the table first if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS number_plate_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        master_entry_id INT NOT NULL,
        number_plate_status ENUM('Pending','Order Done','Gone In Reason') DEFAULT 'Pending',
        number_plate_reason VARCHAR(255) NULL,
        order_date DATE NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (master_entry_id) REFERENCES master_processing(id) ON DELETE CASCADE
      )
    `);

    console.log('Table number_plate_orders checked/created.');

    // Select all master entries that don't have a corresponding number plate order
    const [result] = await pool.query(`
      INSERT INTO number_plate_orders (master_entry_id, number_plate_status)
      SELECT id, 'Pending'
      FROM master_processing
      WHERE id NOT IN (SELECT master_entry_id FROM number_plate_orders)
    `);

    console.log(`Migration completed successfully! Inserted ${result.affectedRows} old records into number_plate_orders.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

syncOldData();
