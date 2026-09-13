import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  FRONTEND_URL: process.env.FRONTEND_URL || '',

  // Session Secret for express-session
  SESSION_SECRET: process.env.SESSION_SECRET || '',

  // Google OAuth 2.0 Credentials
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',

  // Admin Seed Configuration
  ADMIN_NAME: process.env.ADMIN_NAME || 'AirIndex Administrator',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@airindex.gov.in',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecurePassphrase2026!',
};

