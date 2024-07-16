import express from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import db from '../config/db.js';
import useragent from "useragent";

const router = express.Router();
const saltRounds = 10;

router.get('/register', (req, res) => res.render('register.ejs'));
router.get('/login', (req, res) => res.render('login.ejs'));

router.post('/register', async (req, res) => {
    const { email, password, username } = req.body;
    try {
        const checkResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkResult.rows.length > 0) {
            req.flash('error', 'Email already registered. Please log in.');
            res.redirect('/login');
        } else {
            const hash = await bcrypt.hash(password, saltRounds);
            const userResult = await db.query(
                'INSERT INTO users (email, password_hash, username, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [email, hash, username, "subscriber", "unverified"]
            );
            const user = userResult.rows[0];
            const userId = user.user_id;
            // Insert a new tables for the user

            await db.query('INSERT INTO portfolios (user_id) VALUES ($1)', [userId]);
            await db.query('INSERT INTO transactions (user_id) VALUES ($1)', [userId]);
            await db.query('INSERT INTO deposits (user_id) VALUES ($1)', [userId]);
            // await db.query('INSERT INTO  (user_id) VALUES ($1)', [userId]);
            req.login(user, (err) => {
                if (err) {
                    console.error('Login after registration failed:', err);
                    res.status(500).send('Registration successful, but login failed.');
                } else {
                    res.redirect('/registered');
                }
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to register. Please try again later.');
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }

        req.logIn(user, async (err) => {
            if (err) { return next(err); }
            
            try {
                // Fetch the role of the user
                const result = await db.query("SELECT role FROM users WHERE user_id = $1", [user.user_id]);
                const role = result.rows[0].role;
                
                if (role === 'admin') {
                    return res.redirect('/admin-dashboard');
                } else if (role === 'subscriber') {
                    return res.redirect('/dashboard');
                } else {
                    return res.redirect('/login'); // Redirect to login if role is undefined or not recognized
                }
            } catch (err) {
                return next(err);
            }
        });
    })(req, res, next);
});

router.post('/deactivate', async (req, res) => {
    try {
        const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
        const userId = userResult.rows[0].user_id;
        // Update the is_active column to FALSE
        await db.query('UPDATE users SET is_active = FALSE WHERE user_id = $1', [userId]);
    
        res.status(200).json({ message: 'User account deactivated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/logout', (req, res) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

export default router;
