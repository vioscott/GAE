import express from 'express';
import db from '../config/db.js';

const router = express.Router();

router.get('/withdraw', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const portfolios = await db.query('SELECT * FROM portfolios WHERE user_id = $1 AND status = $2', [req.session.user_id, 'settled']);
            const paymentMethods = await db.query('SELECT * FROM payment_methods WHERE active = $1', ['yes']);
            res.render('dashboard/withdraw.ejs', { portfolios: portfolios.rows, paymentMethods: paymentMethods.rows });
        } catch (err) {
            console.error('Error fetching portfolios and payment methods:', err);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect("/login");
    }
});

router.post('/withdraw', async (req, res) => {
    if (req.isAuthenticated()) {
        const { portfolio, type, amount, email, address } = req.body;
        const user_id = req.session.user_id;
        const date = new Date().toLocaleDateString();
        const unix_time = Math.floor(Date.now() / 1000);
        const status = 'pending';

        try {
        const portfolioResult = await pool.query('SELECT * FROM portfolios WHERE id = $1', [portfolio]);
        const portfolioData = portfolioResult.rows[0];
    
        if (amount > portfolioData.amount) {
            if (amount <= portfolioData.balance) {
            await pool.query('BEGIN');
    
            const transactionResult = await pool.query(
                'INSERT INTO transactions(user_id, portfolio_id, amount, type, status, currency, date, unix_time) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                [user_id, portfolio, amount, 'withdrawal', status, type, date, unix_time]
            );
    
            const trxID = transactionResult.rows[0].id;
            const newBalance = portfolioData.balance - amount;
    
            await pool.query('UPDATE portfolios SET balance = $1 WHERE id = $2', [newBalance, portfolio]);
            await pool.query('UPDATE accounts SET wallet = $1 WHERE user_id = $2', [address, user_id]);
    
            await pool.query('COMMIT');
    
            // Optionally send emails here using nodemailer
    
            res.send("<script>swal('Great','We have received your request. you\'ll be contacted soon','success');</script>");
            } else {
            res.send("<script>swal('Oops','Not enough funds in this portfolio','warning');</script>");
            }
        } else {
            res.send("<script>swal('Oops','Minimum withdrawal set for this portfolio is " + portfolioData.amount + "','warning');</script>");
        }
        } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error processing withdrawal:', err);
        res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect("/login");
    }
});

export default router;