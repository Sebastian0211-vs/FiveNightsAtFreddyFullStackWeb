import passport from 'passport';
import { Strategy as JwtStrategy } from 'passport-jwt';
import User from '../models/User.js';

// Extract JWT from the HttpOnly cookie set at login
const cookieExtractor = (req) => {
    if (req && req.cookies) return req.cookies.token || null;
    return null;
};

export function configurePassport() {
    passport.use(
        new JwtStrategy(
            {
                jwtFromRequest: cookieExtractor,
                secretOrKey: process.env.JWT_SECRET,
            },
            async (payload, done) => {
                try {
                    const user = await User.findById(payload.id).select('-password');
                    if (!user) return done(null, false);
                    return done(null, user);
                } catch (err) {
                    return done(err, false);
                }
            }
        )
    );
    return passport;
}

// Middleware for protected REST routes
export const requireAuth = passport.authenticate('jwt', { session: false });
