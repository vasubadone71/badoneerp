const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'badone-erp');
const dbPath = path.join(userDataPath, 'badone_erp.db');

try {
  const db = new Database(dbPath);
  const row = db.prepare('SELECT id FROM settings LIMIT 1').get();
  
  if (row) {
    db.prepare(`
      UPDATE settings 
      SET company_name = ?, address = ?, gst = ?, contact_info = ?
      WHERE id = ?
    `).run(
      'BADONE MOTORS PVT. LTD.',
      'Ward No. 6, Biaora Bus Stand, Guna Road, Biaora, Rajgarh, MP - 465674',
      '23AAHCB4837G1ZT',
      '+91-9425038999',
      row.id
    );
    console.log('Settings updated successfully!');
  } else {
    db.prepare(`
      INSERT INTO settings (company_name, address, gst, contact_info, machine_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'BADONE MOTORS PVT. LTD.',
      'Ward No. 6, Biaora Bus Stand, Guna Road, Biaora, Rajgarh, MP - 465674',
      '23AAHCB4837G1ZT',
      '+91-9425038999',
      'DEVELOPMENT_MODE'
    );
    console.log('Settings inserted successfully!');
  }
  db.close();
} catch (err) {
  console.error('Error:', err.message);
}
