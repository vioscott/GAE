import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import db from './db.js';

export function initPassport(passport) {
    passport.use(new LocalStrategy(async (username, password, done) => {
        try {
            const result = await db.query('SELECT * FROM users WHERE email = $1', [username]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const isValidPassword = await bcrypt.compare(password, user.password_hash);
                return isValidPassword ? done(null, user) : done(null, false, { message: 'Invalid credentials' });
            } else {
                return done(null, false, { message: 'User not found' });
            }
        } catch (err) {
            console.error(err);
            return done(err);
        }
    }));

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));
}
