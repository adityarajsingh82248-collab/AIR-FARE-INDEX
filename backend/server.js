import app from './app.js';
import { env } from './config/env.js';
import { initDatabase } from './config/database.js';
import { validateAuthConfig, printAuthConfigError, printDatabaseError } from './config/authValidation.js';

async function startServer() {
  try {
    // 1. Validate all required Authentication Configuration FIRST
    console.log('Validating authentication and environment configuration...');
    const authCheck = validateAuthConfig(env);
    if (!authCheck.valid) {
      printAuthConfigError(authCheck.errors);
      console.error('AirIndex Backend is NOT READY for authenticated application usage.\n');
      process.exit(1);
    }

    // 2. Validate PostgreSQL connection required for authentication & sessions
    console.log('Connecting to PostgreSQL database for authentication and session store...');
    try {
      await initDatabase();
    } catch (dbError) {
      printDatabaseError(dbError, env.NODE_ENV);
      console.error('AirIndex Backend is NOT READY: Database infrastructure unavailable.\n');
      process.exit(1);
    }

    // 3. Start Express server only after all authentication checks pass
    const server = app.listen(env.PORT, () => {
      console.log(`===========================================`);
      console.log(`AirIndex Backend Server listening on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Allowed Origin: ${env.FRONTEND_URL}`);
      console.log(`Authentication: Google OAuth 2.0 & PostgreSQL Session Store READY`);
      console.log(`Database connected via connection pool`);
      console.log(`===========================================`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\nError: Port ${env.PORT} is already in use by another process.`);
        console.error(`Please stop any other running backend instances or change PORT in backend/.env.\n`);
      } else {
        console.error('Server error:', err.message);
      }
      process.exit(1);
    });

    const shutdown = () => {
      console.log('\nGracefully shutting down AirIndex backend...');
      server.close(() => {
        console.log('Backend HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start AirIndex backend server:', error.message);
    process.exit(1);
  }
}

startServer();
