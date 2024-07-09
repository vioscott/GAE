import express from 'express';
import db from '../config/db.js';

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [req.user.email]);
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const portfolioResult = await db.query("SELECT * FROM portfolios WHERE user_id = $1", [user.user_id]);
            const portfolio = portfolioResult.rows[0] || {};
            const transactionsResult = await db.query("SELECT * FROM transactions WHERE user_id = $1", [user.user_id]);
            const transactions = transactionsResult.rows[0] || {};
            const activitiesResult = await db.query("SELECT * FROM activities WHERE user_id = $1", [user.user_id]);
            const activities = activitiesResult.rows;
            const loginsResult = await db.query('SELECT login_time, device FROM user_logins WHERE user_id = $1 ORDER BY login_time DESC LIMIT 20', [user.user_id]);

            res.render("dashboard/dashboard.ejs", { 
                username: user.username, 
                balance: portfolio.balance,
                profit: portfolio.profit,
                deposited: portfolio.deposited,
                ref_bonus: portfolio.ref_bonus,
                trades: portfolio.trades,
                profile_picture: user.profile_picture,
                amount: activities.amount,
                date: transactions.date,
                portfolio_name: portfolio.portfolio_name,
                transactions: transactions,
                description: activities.description,
                transaction_status: activities.transaction_status,
                date: activities.date,
                activities: activities, logins: loginsResult.rows
            });
        } else {
            res.redirect('/login');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/paid', isAuthenticated, async (req, res) => {
    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [req.user.email]);
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const portfolioResult = await db.query("SELECT * FROM portfolios WHERE user_id = $1", [user.user_id]);
            const portfolio = portfolioResult.rows[0] || {};
            const transactionsResult = await db.query("SELECT * FROM transactions WHERE user_id = $1", [user.user_id]);
            const transactions = transactionsResult.rows[0] || {};
            const activitiesResult = await db.query("SELECT * FROM activities WHERE user_id = $1", [user.user_id]);
            const activities = activitiesResult.rows;
            const loginsResult = await db.query('SELECT login_time, device FROM user_logins WHERE user_id = $1 ORDER BY login_time DESC LIMIT 20', [user.user_id]);

            res.render("dashboard/paid.ejs", { 
                username: user.username, 
                balance: portfolio.balance,
                profit: portfolio.profit,
                deposited: portfolio.deposited,
                ref_bonus: portfolio.ref_bonus,
                trades: portfolio.trades,
                profile_picture: user.profile_picture,
                amount: activities.amount,
                date: transactions.date,
                portfolio_name: portfolio.portfolio_name,
                transactions: transactions,
                description: activities.description,
                transaction_status: activities.transaction_status,
                date: activities.date,
                activities: activities, logins: loginsResult.rows
            });
        } else {
            res.redirect('/login');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
