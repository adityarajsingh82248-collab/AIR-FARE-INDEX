/**
 * Authentication Startup Validator
 * ─────────────────────────────────
 * Validates that all required authentication environment variables are
 * present and non-empty before the server binds to a port.
 *
 * Called once from server.js during startup. Does NOT start the server —
 * that responsibility remains in server.js.
 *
 * Rules:
 *  - Each required variable is checked for existence AND non-empty value.
 *  - Variables are grouped by concern for clear error messaging.
 *  - Secrets are NEVER logged — only the variable NAMES are reported.
 */

/** Required variables grouped by concern */
const AUTH_REQUIREMENTS = [
  {
    group: 'Google OAuth 2.0',
    vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'],
  },
  {
    group: 'Session Store',
    vars: ['SESSION_SECRET'],
  },
  {
    group: 'Application URLs',
    vars: ['FRONTEND_URL'],
  },
  {
    group: 'Database',
    vars: ['DATABASE_URL'],
  },
];

/**
 * Validates authentication configuration from the loaded env object.
 *
 * @param {object} env - The env object from config/env.js
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAuthConfig(env) {
  const errors = [];

  for (const { group, vars } of AUTH_REQUIREMENTS) {
    const missing = vars.filter((key) => {
      const val = env[key];
      return val === undefined || val === null || val === '';
    });

    if (missing.length > 0) {
      errors.push({ group, missing });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Prints a formatted AUTHENTICATION ERROR banner to stderr and exits.
 * Called by server.js when validateAuthConfig() returns valid: false.
 *
 * @param {{ group: string, missing: string[] }[]} errors
 */
export function printAuthConfigError(errors) {
  const SEP = '═'.repeat(60);
  const lines = [
    '',
    SEP,
    '  AUTHENTICATION CONFIGURATION ERROR',
    SEP,
    '',
    '  The backend cannot start because required authentication',
    '  environment variables are missing from backend/.env',
    '',
  ];

  for (const { group, missing } of errors) {
    lines.push(`  ✗ ${group}:`);
    for (const key of missing) {
      lines.push(`      Missing: ${key}`);
    }
    lines.push('');
  }

  lines.push('  Fix: add the missing variables to backend/.env');
  lines.push('  Then restart the development server.');
  lines.push('');
  lines.push(SEP);
  lines.push('');

  process.stderr.write(lines.join('\n'));
}

/**
 * Prints a formatted DATABASE AUTHENTICATION ERROR banner to stderr.
 * Called by server.js when the PostgreSQL connection check fails.
 *
 * @param {Error} err
 * @param {string} [nodeEnv]
 */
export function printDatabaseError(err, nodeEnv = 'development') {
  const SEP = '═'.repeat(60);
  const lines = [
    '',
    SEP,
    '  DATABASE AUTHENTICATION ERROR',
    SEP,
    '',
    '  Unable to connect to PostgreSQL.',
    '  The application cannot start without a database connection.',
    '',
    `  Check that DATABASE_URL in backend/.env points to a running`,
    `  PostgreSQL instance and that the credentials are correct.`,
    '',
  ];

  if (nodeEnv === 'development') {
    // Safe to show message (not the connection string) in dev
    lines.push(`  Error: ${err.message}`);
    lines.push('');
  }

  lines.push(SEP);
  lines.push('');

  process.stderr.write(lines.join('\n'));
}
