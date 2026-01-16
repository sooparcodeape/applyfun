import Database from 'better-sqlite3';

const db = new Database('./local.db');

// Delete all Solana jobs
const result = db.prepare("DELETE FROM jobs WHERE source = 'jobs.solana.com'").run();

console.log(`Deleted ${result.changes} Solana jobs from database`);

// Show remaining job count by source
const sources = db.prepare("SELECT source, COUNT(*) as count FROM jobs GROUP BY source ORDER BY count DESC").all();
console.log('\nRemaining jobs by source:');
sources.forEach(s => console.log(`  ${s.source}: ${s.count}`));

db.close();
