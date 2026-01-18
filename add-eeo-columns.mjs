import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Add gender column if not exists
  try {
    await connection.execute("ALTER TABLE user_profiles ADD COLUMN gender varchar(50)");
    console.log("Added gender column");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log("gender column already exists");
    } else {
      throw e;
    }
  }
  
  // Add race column if not exists
  try {
    await connection.execute("ALTER TABLE user_profiles ADD COLUMN race varchar(100)");
    console.log("Added race column");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log("race column already exists");
    } else {
      throw e;
    }
  }
  
  // Add veteran_status column if not exists
  try {
    await connection.execute("ALTER TABLE user_profiles ADD COLUMN veteran_status varchar(100)");
    console.log("Added veteran_status column");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log("veteran_status column already exists");
    } else {
      throw e;
    }
  }
  
  await connection.end();
  console.log("Done!");
}

main().catch(console.error);
