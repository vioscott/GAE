import express from 'express';
import db from '../config/db.js';

const router = express.Router();


router.get('/withdraw', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user.user_id;
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            const user = userResult.rows[0];
            const portfolioId = req.query.portfolio.id;
            let portfolio;
            if (portfolioId) {
                const portfolioResult = await db.query('SELECT * FROM portfolios WHERE user_id = $1 AND id = $2', [userId, portfolioId]);
                portfolio = portfolioResult.rows[0];
            }
            
            const portfoliosResult = await db.query('SELECT * FROM portfolios WHERE status = $1 AND user_id = $2', ['settled', userId]);
            const portfolios = portfoliosResult.rows;
            
            const paymentMethodsResult = await db.query('SELECT * FROM payment_methods WHERE active = $1', ['yes']);
            const paymentMethods = paymentMethodsResult.rows;
            
            res.render('dashboard/withdraw.ejs', { portfolio, portfolios, paymentMethods,...user });
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
        const userId = req.session.user_id;
        const { amount, type, email, address, portifolio } = req.body;
        const date = new Date().toLocaleDateString();
        const unix_time = Math.floor(Date.now() / 1000);
        const status = 'pending';
        const description = `new withdrawal of $${amount}`;
        try{
            const portfolioResult = await db.query('SELECT * FROM portfolios WHERE id = $1', [portifolio]);
            const portfolio = portfolioResult.rows[0];
            const portfolioBalance = portfolio.balance;
            const portfolioName = portfolio.name;
            const portfolioAmount = portfolio.amount;
    
            if (amount > portfolioAmount) {
                if (amount <= portfolioBalance) {
                    const transactionResult = await db.query('INSERT INTO transactions(user_id, folio_id, amount, type, status, currency, date, unix_time) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [userId, portifolio, amount, 'withdrawal', status, type, date, unix_time]);
                    const trxID = transactionResult.rows[0].id;
            
                    const newAmount = portfolioBalance - amount;
                    await db.query('UPDATE portfolios SET balance = $1 WHERE id = $2', [newAmount, portifolio]);
                    await db.query('UPDATE accounts SET wallet = $1 WHERE user_id = $2', [address, userId]);
            

                    function generateRandomCode(length) {
                        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                        let result = '';
                        for (let i = 0; i < length; i++) {
                          result += characters.charAt(Math.floor(Math.random() * characters.length));
                        }
                        return result;
                    }
                    
                        const trx_id = generateRandomCode(10); // Generate a random code of 10 characters 
                    // Insert transaction
                    const result = await db.query(
                        'INSERT INTO transactions(user_id, transaction_id, amount, type, status, date, unix_time, currency) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                        [userId, trx_id, amount, 'withdrawal', status, date, unixTime]
                    );
        
                    // Insert activity
                    await db.query(
                        `INSERT INTO activities (user_id, portfolio_name, amount, status, description, date)
                        VALUES ($1, $2, $3, $4, $5, $6)`, 
                        [userId, portfolioName, amount, status, description, date]
                    );
        
                    const trxId = result.rows[0].id;
        
                    // Send user email
                    const userMailOptions = {
                        from: process.env.EMAIL,
                        to: email,
                        subject: 'New deposit awaiting confirmation',
                        text: 'Your deposit request has been received and is awaiting confirmation. You will be contacted once our team has reviewed your account.'
                    };
        
                    await transporter.sendMail(userMailOptions);
        
                    // Send admin email
                    const adminMailOptions = {
                        from: process.env.EMAIL,
                        to: adminEmail,
                        subject: 'New deposit awaiting confirmation',
                        html: `<p>New deposit</p>
                            <p>Amount: ${amount}</p>
                            <p>From: ${email}</p>`
                    };
        
                    await transporter.sendMail(adminMailOptions);
                    // Assuming createActivity is defined elsewhere
                    // createActivity(userId, `$${amount} withdrawal placed for ${portifolioName}`, portifolioName, amount, date, '', trxID);
            
                    // Send email to admin and user (assume sendmail is defined elsewhere)
                    // sendmail(admin_email, `Withdrawal request for ${username} #${rand}`, `New Withdrawal request for ${email}. Amount: ${amount}, BTC Address: ${wallet}, Email: ${email}`);
            
                    res.send("<script>swal('Great','We have received your request. you\'ll be contacted soon','success');</script>");
                } else {
                    res.send("<script>swal('Oops','Not enough funds in this portfolio','warning');</script>");
                }
            } else {
            res.send("<script>swal('Oops','Maximum withdrawal set for this portfolio is " + portfolioData.amount + "','warning');</script>");
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