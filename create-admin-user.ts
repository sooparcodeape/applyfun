import bcrypt from 'bcryptjs';
import { getDb } from './server/db';
import { users, userProfiles, userCredits } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function createAdminUser() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  const email = 'employee1@apply.fun';
  const password = 'NachaJello2!';
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    // Check if admin user already exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    
    if (existing.length > 0) {
      console.log('✅ Admin user already exists');
      console.log(`   Email: ${email}`);
      console.log(`   Role: ${existing[0].role}`);
      
      // Update to admin role if not already
      if (existing[0].role !== 'admin') {
        await db.update(users)
          .set({ role: 'admin' })
          .where(eq(users.id, existing[0].id));
        console.log('   Updated role to admin');
      }
      
      return;
    }

    // Create admin user
    const [user] = await db.insert(users).values({
      email,
      name: 'Employee1',
      passwordHash,
      loginMethod: 'email',
      role: 'admin',
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);

    // Create user profile
    await db.insert(userProfiles).values({
      userId: user.insertId,
    });

    // Create user credits
    await db.insert(userCredits).values({
      userId: user.insertId,
      balance: 0,
    });

    console.log('✅ Admin profile and credits initialized');

  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser()
  .then(() => {
    console.log('\n✅ Admin user setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
