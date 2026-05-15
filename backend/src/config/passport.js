import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/google/callback`,
      passReqToCallback: true, // Allows us to access the 'state' for roles
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile?.emails?.[0]?.value?.toLowerCase()?.trim();

        if (!email) {
          return done(new Error('Google account email is required'), null);
        }

        // 1. Try to find user by googleId
        let user = await User.findOne({ googleId: profile.id });

        // 2. If not found by googleId, check by email
        if (!user) {
          user = await User.findOne({ email });

          if (user) {
            // Link existing email account to Google
            if (user.googleId && user.googleId !== profile.id) {
              return done(
                new Error('This email is already linked to another Google account'),
                null
              );
            }

            user.googleId = profile.id;
            user.isVerified = true;

            if (!user.fullName && profile.displayName) {
              user.fullName = profile.displayName;
            }

            await user.save();
          }
        }

        // 3. Create new user if they don't exist at all
        if (!user) {
          // Extract role from state if you passed it from the frontend
          let role = 'worker';
          if (req.query.state) {
            try {
              const decodedState = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
              if (decodedState.role) role = decodedState.role;
            } catch (e) {
              console.error("Error parsing OAuth state:", e);
            }
          }

          user = await User.create({
            fullName: profile.displayName || 'Google User',
            email,
            googleId: profile.id,
            role: role,
            isVerified: true,
            // DO NOT include the location object here. 
            // The model will now handle it as 'undefined' which avoids the GeoJSON error.
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    if (!user) return done(null, false);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;