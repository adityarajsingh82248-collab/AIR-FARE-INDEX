import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import passport from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import indexRoutes from './routes/indexRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

const app = express();
const PgSession = connectPgSimple(session);

// Trust proxy for secure cookies behind reverse proxy / dev proxy
app.set('trust proxy', 1);

// Configure CORS (Strict origin, no wildcards, credentials allowed)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        env.FRONTEND_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body and cookie parsing
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Server-side session configuration backed by PostgreSQL
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: 'session',
    }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware for Google OAuth & session management
app.use(passport.initialize());
app.use(passport.session());

// Root endpoint: API Status & Web App navigation
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    return res.type('html').send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AirIndex Backend API</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #0b1120;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 1rem;
          }
          .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 1rem;
            padding: 2.5rem;
            max-width: 540px;
            width: 100%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            text-align: center;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
            padding: 0.35rem 0.85rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 1.25rem;
          }
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
          }
          h1 {
            margin: 0 0 0.5rem 0;
            font-size: 1.75rem;
            font-weight: 700;
            color: #ffffff;
          }
          p {
            color: #94a3b8;
            line-height: 1.6;
            margin: 0 0 1.5rem 0;
          }
          .btn-group {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-top: 1.5rem;
          }
          .btn {
            display: block;
            text-decoration: none;
            padding: 0.75rem 1.25rem;
            border-radius: 0.5rem;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.2s ease;
          }
          .btn-primary {
            background: #3b82f6;
            color: #ffffff;
          }
          .btn-primary:hover {
            background: #2563eb;
          }
          .btn-secondary {
            background: #334155;
            color: #cbd5e1;
          }
          .btn-secondary:hover {
            background: #475569;
            color: #ffffff;
          }
          .info-list {
            text-align: left;
            background: #0f172a;
            border-radius: 0.5rem;
            padding: 1rem;
            font-size: 0.875rem;
            color: #94a3b8;
            margin: 1.5rem 0;
            border: 1px solid #1e293b;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 0.25rem 0;
          }
          .info-val {
            color: #38bdf8;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge"><span class="dot"></span> Backend Online & Connected</div>
          <h1>AirIndex Backend Server</h1>
          <p>The backend API is running and connected to PostgreSQL. The main application is hosted on the frontend server.</p>
          
          <div class="info-list">
            <div class="info-row"><span>Backend Port:</span><span class="info-val">5000 (Online)</span></div>
            <div class="info-row"><span>Database:</span><span class="info-val">PostgreSQL (Connected)</span></div>
            <div class="info-row"><span>Health Check:</span><span class="info-val"><a href="/api/health" style="color: #38bdf8;">/api/health</a></span></div>
          </div>

          <div class="btn-group">
            <a href="${env.FRONTEND_URL || 'http://localhost:5173'}" class="btn btn-primary">🚀 Open AirIndex Web App (Port 5173)</a>
            <a href="${env.FRONTEND_URL || 'http://localhost:5173'}/admin/login" class="btn btn-secondary">🔐 Admin Portal Login</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  res.status(200).json({
    status: 'online',
    service: 'AirIndex Backend API',
    message: 'Backend server is running and connected to PostgreSQL.',
    frontendUrl: env.FRONTEND_URL || 'http://localhost:5173',
    endpoints: {
      health: '/api/health',
      auth: '/auth',
      admin: '/api/admin',
      users: '/api/users',
    },
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'airindex-backend',
    auth: 'google-oauth20-session',
    timestamp: new Date().toISOString(),
  });
});

// API Routes mounted for both /auth and /api/auth
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

// Air Fare Index data endpoints (reads from real modeltest dataset)
app.use('/api/index', indexRoutes);

// 404 and Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
