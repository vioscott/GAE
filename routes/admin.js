import express from 'express';
import db from '../config/db.js';
import fetch from 'node-fetch';
import sendMail from '../config/mail.js'

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

router.get('/admin-dashboard', isAuthenticated, async (req, res) => {
    try {
        const [
            portfoliosResult,
            transactionsResult,
            depositsResult,
            userResult,
            totalUsersResult,
            activeClientsResult,
            totalDepositsResult,
            verified_users,
            unverified_users,
            suspended_users
        ] = await Promise.all([
            db.query(`
                SELECT portfolios.portfolio_name AS portfolio_name, users.username, users.email 
                FROM portfolios 
                INNER JOIN users ON portfolios.user_id = users.user_id 
                WHERE portfolios.status = 'active' 
                ORDER BY portfolios.id DESC
            `),
            db.query(`
                SELECT transactions.id AS transaction_id, transactions.amount, transactions.status, users.username, users.email 
                FROM transactions 
                INNER JOIN users ON transactions.user_id = users.user_id 
                WHERE transactions.status = 'pending' AND transactions.type = 'withdrawal' 
                ORDER BY transactions.id DESC
            `),
            db.query(`
                SELECT transactions.id AS transaction_id, transactions.amount, transactions.status, users.username, users.email
                FROM transactions 
                INNER JOIN users ON transactions.user_id = users.user_id 
                WHERE transactions.status = 'pending' AND transactions.type = 'deposit' 
                ORDER BY transactions.id DESC
            `),
            db.query("SELECT * FROM users WHERE role = 'subscriber' ORDER BY user_id DESC"),
            db.query("SELECT COUNT(*) AS total_users FROM users"),
            db.query("SELECT COUNT(*) AS active_clients_num FROM users WHERE status = 'active'"),
            db.query("SELECT SUM(amount) AS deposits FROM transactions WHERE type = 'deposit'"),
            db.query("SELECT * FROM users WHERE status = 'verified' ORDER BY user_id DESC"),
            db.query("SELECT * FROM users WHERE status = 'unverified' ORDER BY user_id DESC"),
            db.query("SELECT * FROM users WHERE is_active = 'false' ORDER BY user_id DESC"),
        ]);
        const summaryResult = await db.query(`
            SELECT 
            (SELECT SUM(balance) FROM portfolios) AS total_balance,
            (SELECT COUNT(*) FROM portfolios) AS num_portfolio,
            (SELECT COUNT(*) FROM portfolios WHERE status = 'active') AS num_active_portfolio,
            (SELECT COUNT(*) FROM portfolios WHERE status = 'pending') AS num_pending_portfolio,
            (SELECT COUNT(*) FROM portfolios WHERE status = 'settled') AS num_settled_portfolio
        `);
        const summary = summaryResult.rows[0];
        const portfolios = portfoliosResult.rows;
        const withdrawals = transactionsResult.rows;
        const deposits = depositsResult.rows;
        const users = userResult.rows;
        const total_users = totalUsersResult.rows[0].total_users;
        const active_clients_num = activeClientsResult.rows[0].active_clients_num;
        const total_deposits = totalDepositsResult.rows[0].deposits || 0; // Default to 0 if no deposits

        const userTrackings = await Promise.all(users.map(async (user) => {
            const response = await fetch(`https://ipinfo.io/${user.ip_address}/json`);
            const userData = await response.json();
            return {
                username: user.username,
                ip: user.ip_address,
                city: userData.city,
                region: userData.region,
                country: userData.country
            };
        }));

        res.render('admin/admin.ejs', {
            users,
            total_users,
            active_clients_num,
            total_deposits,
            portfolios,
            userTrackings,
            withdrawals,
            deposits,
            verified_users,
            unverified_users,
            suspended_users, num_portfolio: summary.num_portfolio || 0,
            num_active_portfolio: summary.num_active_portfolio || 0,
            num_settled_portfolio: summary.num_settled_portfolio || 0,
            num_pending_portfolio: summary.num_pending_portfolio || 0,
            admin_name: req.user.username // Assuming you store the admin's name in req.user
        });
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
});

router.post('/approve-deposit', isAuthenticated, async (req, res) => {
    const { trx_id } = req.body;
    try {
        await db.query("UPDATE transactions SET status = 'approved' WHERE id = $1", [trx_id]);
        res.redirect('/deposits');
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
});

router.post('/decline-deposit',isAuthenticated, async (req, res) => {
    const { trx_id } = req.body;
    try {
        await db.query("UPDATE transactions SET status = 'declined' WHERE id = $1", [trx_id]);
        res.redirect('/deposits');
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
});

router.post('/approve-withdrawal',isAuthenticated, async (req, res) => {
    const { trx_id } = req.body;
    try {
        await db.query("UPDATE transactions SET status = 'approved' WHERE id = $1", [trx_id]);
        res.redirect('/withdrawals');
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
});

router.post('/decline-withdrawal',isAuthenticated, async (req, res) => {
    const { trx_id } = req.body;
    try {
        await db.query("UPDATE transactions SET status = 'declined' WHERE id = $1", [trx_id]);
        res.redirect('/withdrawals');
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
});

// Fetch client data
router.get('/tables', isAuthenticated, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM activities ORDER BY id DESC');
        const usersResult = await db.query('SELECT user_id, username, email FROM users');
        const users = usersResult.rows;
        const activities = result.rows.map(activity => {
        const user = users.find(user => user.id === activity.user_id);
        return { ...activity, username: user ? user.username : '', email: user ? user.email : '' };
    });
        res.render('admin/tables.ejs', { admin_name: req.user.username, activities });
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
});

  // Edit transaction route
router.post('/edit-transaction', isAuthenticated, async (req, res) => {
    const { id, description, date } = req.body;
    try {
        await db.query('UPDATE activities SET description = $1, date = $2 WHERE id = $3', [description, date, id]);
        res.send({ message: 'Transaction edited successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Error editing transaction' });
    }
});

  // Delete transaction route
router.post('/delete-transaction', isAuthenticated, async (req, res) => {
    const { id } = req.body;
    try {
        await db.query('DELETE FROM activities WHERE id = $1', [id]);
        res.send({ message: 'Transaction deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Error deleting transaction' });
    }
});

router.get('/change-password',isAuthenticated, async (req, res) => {
    res.render('admin/change-password.ejs');
});

router.post('/forgot-admin-password', isAuthenticated, async (req, res) => {
    const { password } = req.body;
    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        try {
            await pool.query("UPDATE users SET password = $1 WHERE role = 'admin'", [hashedPassword]);
            const adminEmail = 'admin@example.com'; // Replace with actual admin email
            const subject = "Admin password reset";
            const message = "Your password for Global Assets Empire has been changed.<br> Please contact the developer if you didn't initiate this change.";
            sendMail(adminEmail, subject, message);
            res.redirect('/admin-dashboard');
        } catch (err) {
            console.error(err);
            res.status(500).send("Error updating password");
        }
    } else {
        res.status(400).send("Password cannot be empty");
    }
});

// Change username route
router.get('/change-username',isAuthenticated, async (req, res) => {
    res.render('admin/change-username.ejs');
});

router.post('/change-username', isAuthenticated, async (req, res) => {
    const { uname } = req.body;
    if (uname) {
        try {
            await pool.query("UPDATE users SET username = $1 WHERE role = 'admin'", [uname]);
            const adminEmail = 'admin@example.com'; // Replace with actual admin email
            const subject = "Admin Username reset";
            const message = "Your Username for Global Assets Empire has been changed.<br> Please contact the developer if you didn't initiate this change.";
            sendMail(adminEmail, subject, message);
            res.redirect('/admin-dashboard');
        } catch (err) {
            console.error(err);
            res.status(500).send("Error updating username");
        }
    } else {
        res.status(400).send("Username cannot be empty");
    }
});

// Change email route
router.get('/change-email',isAuthenticated, async (req, res) => {
    res.render('admin/change-email.ejs');
});

router.post('/change-email',isAuthenticated, async (req, res) => {
    const { email } = req.body;
    if (email) {
        try {
            await db.query("UPDATE users SET email = $1 WHERE role = 'admin'", [email]);
            const adminEmail = 'admin@example.com'; // Replace with actual admin email
            const subject = "Admin Email reset";
            const message = "Your Email address for Global Assets Empire has been changed.<br> Please contact the developer if you didn't initiate this change.";
            sendMail(adminEmail, subject, message);
            res.redirect('index');
        } catch (err) {
            console.error(err);
            res.status(500).send("Error updating email");
        }
    } else {
        res.status(400).send("Email cannot be empty");
    }
});

router.get('/payments', isAuthenticated, async (req, res) => {
        const admin_name = req.user.username;
        const { rows: bank } = await db.query('SELECT * FROM bank_transfer WHERE id = 1');
        res.render('admin/payments.ejs', { admin_name, bank: bank[0] });
});

router.post('/edit-payments',isAuthenticated, async (req, res) => {
    const { bank_name, bank_details, account_details, bankActive } = req.body;
    await db.query(`
        UPDATE bank_transfer 
        SET bank_name = $1, bank_details = $2, account_details = $3, active = $4 
        WHERE id = 1
    `, [bank_name, bank_details || bank.bank_details, account_details || bank.account_details, bankActive === 'yes']);
    
    res.redirect('/payments');
});

router.get('/site-info',isAuthenticated, async (req, res) => {
    const { rows: settings } = await db.query('SELECT * FROM settings ORDER BY id');
    res.render('admin/site-info.ejs', { sitename: settings[0].value, sitemail: settings[1].value, sitephone: settings[2].value });
});

router.post('/site-info', isAuthenticated, async (req, res) => {
    const { sitename, email, phone } = req.body;
    await db.query('UPDATE settings SET value = $1 WHERE id = 1', [sitename]);
    await db.query('UPDATE settings SET value = $1 WHERE id = 2', [email]);
    await db.query('UPDATE settings SET value = $1 WHERE id = 3', [phone]);

    res.redirect('/site-info?success=true');
});

router.get('/plans',isAuthenticated, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM iv_schemes');
        const details = await db.query('SELECT * FROM settings WHERE id = 1');
        const siteDetails = details.rows[0] || {};
        res.render('admin/plans.ejs', { 
            sitename: siteDetails.value, 
            admin_name: req.user.username, 
            plans: result.rows 
        });
    } catch (err) {
        console.error(err);
        res.send('Error ' + err);
    }
});

router.post('/create-plan',isAuthenticated, async (req, res) => {
    const { newplanname, newslug, newamount, newmaxamount, newroi, newterm, newduration } = req.body;
    const period = newduration == 1 ? 'days' : newduration == 7 ? 'weeks' : 'months';
    const days = parseInt(newduration) * parseInt(newterm);

    try {
        await db.query(
            'INSERT INTO iv_schemes (name, slug, amount, roi, returns, term, max_amount, days, duration) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', 
            [newplanname, newslug, newamount, newroi, 0, newterm, newmaxamount, days, period]
        );
        res.redirect('/plans');
    } catch (err) {
        console.error(err);
        res.send('Error ' + err);
    }
});

router.get('/edit-users', isAuthenticated, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users ORDER BY user_id DESC');
        const accounts = result.rows;
        
        res.render('admin/edit-users.ejs', { accounts, admin_name: req.user.username });
    } catch (err) {
        console.error(err);
        res.send('Error ' + err);
    }
});

router.post('/edit-user',isAuthenticated, async (req, res) => {
    const { user_id, uname, full_name, email, phone, wallet, active } = req.body;
    try {
        await db.query(`
            UPDATE users
            SET username = $1, name = $2, email = $3, phone = $4, wallet = $5, active = $6
            WHERE id = $7`,
            [uname, full_name, email, phone, wallet, active, user_id]
        );
        res.send('User data updated successfully.');
    } catch (err) {
        console.error(err);
        res.send('Error ' + err);
    }
});

  // Handle POST request to block user
router.post('/block-user', isAuthenticated, async (req, res) => {
    const user_id = req.body.user_id;
    try {
        await db.query('UPDATE users SET status = $1 WHERE user_id = $2', ['suspended', user_id]);
        res.send('User blocked successfully.');
    } catch (err) {
        console.error(err);
        res.send('Error ' + err);
    }
});

  // Handle POST request to unblock user
router.post('/unblock-user', isAuthenticated, async (req, res) => {
    const user_id = req.body.user_id;
    try {
        await db.query('UPDATE users SET status = $1 WHERE user_id = $2', ['verified', user_id]);
        res.send('User unblocked successfully.');
    } catch (err) {
        console.error(err);
        res.send('Error ' + err);
    }
});

router.get('/messages',isAuthenticated, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE role = $1', ['subscriber']);
        res.render('admin/messages.ejs', { users: result.rows, admin_name: req.user.username });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Error fetching users');
    }
});

// Handle sending email form submission
router.post('/send-email', isAuthenticated, async (req, res) => {
    const { email, subject, message } = req.body;
    try {
        // Code to send email
        // Replace this with your email sending logic
        console.log(`Email sent to ${email} with subject: ${subject} and message: ${message}`);
        res.redirect('/edit-users');
    } catch (err) {
        console.error('Error sending email:', err);
        res.status(500).send('Error sending email');
    }
});

router.get('/newsletter',isAuthenticated, async (req, res) => {
    try {
        const users = await db.query('SELECT email FROM users WHERE role = $1', ['subscriber']);
        res.render('admin/newsletter.ejs', { users: users.rows, admin_name: req.user.username });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Error fetching users');
    }
});

router.post('/newsletter',  isAuthenticated, async (req, res) => {
    const { subject, message } = req.body;
    try {
        const users = await db.query('SELECT email FROM users WHERE role = $1', ['subscriber']);
        const emails = users.rows.map(user => user.email);

        // Call function to send email to each user
        await sendMail(emails, subject, message);

        res.render('newsletter', { successMessage: 'Newsletter sent successfully!' });
    } catch (err) {
        console.error('Error sending newsletter:', err);
        res.status(500).send('Error sending newsletter');
    }
});


export default router;