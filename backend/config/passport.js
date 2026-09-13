import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

// Serialize user ID into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session by ID
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return done(null, false);
    }
    // Reject deactivated accounts
    if (!user.is_active) {
      return done(null, false);
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Configure Google OAuth 2.0 Strategy
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
          const profilePicture = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

          if (!email) {
            return done(new Error('No email associated with this Google account.'), null);
          }

          const user = await User.findOrCreateGoogleUser({
            googleId: profile.id,
            email,
            name,
            profilePicture,
          });

          // Check if account was deactivated by admin
          if (!user.is_active) {
            return done(new Error('This account has been deactivated. Please contact an administrator.'), null);
          }

          // Record audit log
          const ipAddress = req.ip || req.connection?.remoteAddress;
          const userAgent = req.headers['user-agent'];
          await AuditLog.create({
            userId: user.id,
            action: 'USER_GOOGLE_LOGIN',
            details: { email: user.email, role: user.role, googleId: profile.id },
            ipAddress,
            userAgent,
          });

          return done(null, user);
        } catch (err) {
          console.error('Google Strategy Error:', err.message);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('[Notice] Passport Google Strategy not registered: Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.');
}

export default passport;
