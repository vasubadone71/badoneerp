const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Assuming the DB is in the standard electron userData path for this app
// On Windows it's usually %APPDATA%\insurance---rto-drive\badone_erp.db
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'insurance---rto-drive', 'badone_erp.db');

try {
  const db = new Database(dbPath);
  console.log('--- Agent Commissions ---');
  const commissions = db.prepare('SELECT * FROM agent_commissions').all();
  console.log(JSON.stringify(commissions, null, 2));
  
  console.log('\n--- Master Entries with Dealer Type ---');
  const entries = db.prepare(`
    SELECT m.id, m.invoice_no, n.dealer_name, n.dealer_type 
    FROM master_entries m 
    JOIN network_locations n ON m.location_id = n.id
  `).all();
  console.log(JSON.stringify(entries, null, 2));
} catch (e) {
  console.error('Error reading DB:', e.message);
}
