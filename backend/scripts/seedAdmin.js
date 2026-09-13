import { initDatabase, query } from '../config/database.js';
import { env } from '../config/env.js';
import { hashPassword } from '../utils/password.js';
import AuditLog from '../models/AuditLog.js';

async function seedAdmin() {
  console.log('--- Seeding AirIndex Initial Administrator ---');

  try {
    // 1. Ensure database schema is ready
    await initDatabase();

    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD must be configured in backend/.env');
      process.exit(1);
    }

    const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();

    // 2. Check if admin user already exists
    const checkRes = await query(
      `SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1);`,
      [normalizedEmail]
    );

    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    if (checkRes.rows.length > 0) {
      const existingUser = checkRes.rows[0];
      console.log(`User ${normalizedEmail} exists. Updating role to ADMIN and refreshing credentials...`);
      
      await query(
        `UPDATE users 
         SET name = $1, password_hash = $2, role = 'ADMIN', is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3;`,
        [ADMIN_NAME, passwordHash, existingUser.id]
      );

      await AuditLog.create({
        userId: existingUser.id,
        action: 'ADMIN_SEEDED_UPDATE',
        details: { email: normalizedEmail, role: 'ADMIN' },
      });

      console.log(`Admin account [${normalizedEmail}] successfully updated.`);
    } else {
      console.log(`Creating new administrator account [${normalizedEmail}]...`);

      const insertRes = await query(
        `INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, 'ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, name, email, role;`,
        [ADMIN_NAME, normalizedEmail, passwordHash]
      );

      const newAdmin = insertRes.rows[0];

      await AuditLog.create({
        userId: newAdmin.id,
        action: 'ADMIN_SEEDED_CREATE',
        details: { email: normalizedEmail, role: 'ADMIN' },
      });

      console.log(`Admin account [${normalizedEmail}] successfully created.`);
    }

    console.log('Admin seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Admin seeding failed:', error.message);
    process.exit(1);
  }
}

seedAdmin();
