const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Assuming the DB is in the standard location
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'insurance---rto-drive', 'badone_erp.db');
// Wait, the path might be different based on app name. Let's check package.json for app name.
// Actually, I can check the electron/main.js or just try to find it.

const db = new Database(dbPath, { readonly: true });

console.log('--- Network Locations ---');
const dealers = db.prepare('SELECT id, dealer_name, dealer_type FROM network_locations').all();
console.table(dealers);

console.log('\n--- Recent Master Entries ---');
const entries = db.prepare('SELECT id, customer_name, location_id FROM master_entries ORDER BY id DESC LIMIT 5').all();
console.table(entries);

console.log('\n--- Insurance Details for Recent Entries ---');
const ins = db.prepare('SELECT master_entry_id, insurance_difference, status FROM insurance_details ORDER BY id DESC LIMIT 5').all();
console.table(ins);

console.log('\n--- Agent Commissions ---');
const comms = db.prepare('SELECT * FROM agent_commissions').all();
console.table(comms);

db.close();
