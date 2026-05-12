const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'insurance---rto-drive', 'badone_erp.db');

try {
  const db = new Database(dbPath);
  console.log('--- SURESH TANWAR entry check ---');
  const entry = db.prepare(`
    SELECT m.invoice_no, m.customer_name, n.dealer_name, n.dealer_type 
    FROM master_entries m 
    JOIN network_locations n ON m.location_id = n.id
    WHERE m.customer_name LIKE '%SURESH%'
  `).get();
  console.log(JSON.stringify(entry, null, 2));

  console.log('\n--- Commission for this entry ---');
  if (entry) {
    const masterEntry = db.prepare('SELECT id FROM master_entries WHERE customer_name LIKE "%SURESH%"').get();
    if (masterEntry) {
      const comm = db.prepare('SELECT * FROM agent_commissions WHERE master_entry_id = ?').all(masterEntry.id);
      console.log(JSON.stringify(comm, null, 2));
    }
  }
} catch (e) {
  console.error('Error reading DB:', e.message);
}
