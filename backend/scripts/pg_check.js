import { pool, query } from '../config/database.js';

async function checkPostgres() {
  try {
    const v = await pool.query('SELECT version()');
    const ver = v.rows[0].version.split(' ').slice(0, 2).join(' ');
    console.log('[DB] PostgreSQL Version:', ver);

    const tables = await query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log('[DB] Tables:', tables.rows.map(r => r.table_name));

    const users = await query('SELECT id, name, email, role, is_active, google_id FROM users ORDER BY id');
    console.log('[DB] Users:');
    users.rows.forEach(u => console.log(' ', u));

    const sessions = await query('SELECT count(*) AS cnt FROM session');
    console.log('[DB] Active Sessions:', sessions.rows[0].cnt);

    const logs = await query('SELECT count(*) AS cnt FROM audit_logs');
    console.log('[DB] Audit Log Entries:', logs.rows[0].cnt);

    const ins = await query(
      "INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (NULL, 'PG_HEALTH_CHECK', '{}', NOW()) RETURNING id"
    );
    const newId = ins.rows[0].id;
    console.log('[DB] Write test: inserted audit_log id', newId);
    await query('DELETE FROM audit_logs WHERE id = $1', [newId]);
    console.log('[DB] Delete test: removed audit_log id', newId);

    console.log('\n[DB] ALL CHECKS PASSED - PostgreSQL integration is healthy!');
  } catch (err) {
    console.error('[DB] ERROR:', err.message);
    console.error('[DB] Code:', err.code);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkPostgres();
