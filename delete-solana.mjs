import { db } from './server/db.ts';

// Delete all Solana jobs
const result = await db.execute("DELETE FROM jobs WHERE source = 'jobs.solana.com'");

console.log('Deleted Solana jobs from database');

// Show remaining job count
const sources = await db.execute("SELECT source, COUNT(*) as count FROM jobs GROUP BY source ORDER BY count DESC");
console.log('\nRemaining jobs by source:');
console.log(sources.rows);
