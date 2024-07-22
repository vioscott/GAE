import express from 'express';
import db from '../config/db.js';
import axios from 'axios';
import sendMail from '../config/mail.js';

const router = express.Router();

const getCryptoData = async () => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                ids: 'bitcoin,ethereum,usdt'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        return [];
    }
};


router.get("/portfolios", async (req, res) => {
    console.log(req.user);

    if (req.isAuthenticated()) {
        try {
            const userId = req.user.user_id; // Adjust based on how you store the user ID
            const botsResult = await db.query("SELECT * FROM bots");
            const paymentMethodsResult = await db.query("SELECT * FROM payment_methods");
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            const user = userResult.rows[0];
            const bots = botsResult.rows;
            const paymentMethods = paymentMethodsResult.rows;

            // Fetch user summary data
            const summaryResult = await db.query(`
                SELECT 
                (SELECT SUM(balance) FROM portfolios WHERE user_id = $1) AS total_balance,
                (SELECT COUNT(*) FROM portfolios WHERE user_id = $1) AS num_portfolio,
                (SELECT COUNT(*) FROM portfolios WHERE user_id = $1 AND status = 'active') AS num_active_portfolio,
                (SELECT COUNT(*) FROM portfolios WHERE user_id = $1 AND status = 'settled') AS num_settled_portfolio
            `, [userId]);
            const summary = summaryResult.rows[0];

            // Fetch portfolios
            const portfoliosResult = await db.query(`
                SELECT portfolios.id, portfolios.portfolio_name, portfolios.ticker, portfolios.balance, portfolios.rate, portfolios.amount, portfolios.status, portfolios.created_at, iv_schemes.roi as roi, iv_schemes.duration as duration
                FROM portfolios
                INNER JOIN iv_schemes ON portfolios.rate = iv_schemes.id
                WHERE portfolios.user_id = $1
                ORDER BY portfolios.id DESC
            `, [userId]);
            const portfolios = portfoliosResult.rows;

            res.render('dashboard/portfolios.ejs', {
                balance: summary.total_balance || 0,
                num_portfolio: summary.num_portfolio || 0,
                num_active_portfolio: summary.num_active_portfolio || 0,
                num_settled_portfolio: summary.num_settled_portfolio || 0,
                portfolios,  // Directly pass portfolios
                availablePortfolios: portfolios.filter(p => p.bot === 0),
                bots, ...user,
                paymentMethods,
            });
        } catch (err) {
            console.error('Error fetching portfolio details:', err);
            res.status(500).send('Internal server error');
        }
    } else {
        res.redirect("/login");
    }
});



router.get("/activities", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const portfolioResult = await db.query("SELECT * FROM portfolios WHERE user_id = $1", [user.user_id]);
                const portfolio = portfolioResult.rows[0] || {};
                const activitiesResult = await db.query("SELECT * FROM activities WHERE user_id = $1", [user.user_id]);
                const activities = activitiesResult.rows;

                res.render("dashboard/activities.ejs", { 
                    username: user.username, 
                    balance: portfolio.balance,
                    profit: portfolio.profit, 
                    deposited: portfolio.deposited,
                    ref_bonus: portfolio.ref_bonus,
                    trades: portfolio.trades,
                    profile_picture: user.profile_picture,
                    description: activities.description,
                    amount: activities.amount,
                    transaction_status: activities.transaction_status,
                    date: activities.date,
                    portfolio_name: portfolio.portfolio_name,
                    activities: activities
                });
            } else {
                res.redirect("/login");
            }
        } catch (err) {
            console.log(err);
        }
    } else {
        res.redirect("/login");
    }
});

router.get("/fund", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const user_id = req.user.user_id;
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            const user = userResult.rows[0];
    
            const portfoliosResult = await db.query('SELECT * FROM portfolios WHERE user_id = $1', [user_id]);
            const plansResult = await db.query('SELECT * FROM iv_schemes WHERE active = $1', ['yes']);
            const paymentMethodsResult = await db.query('SELECT * FROM addresses');

                res.render('dashboard/fund.ejs', {
                    portfolios: portfoliosResult.rows,
                    plans: plansResult.rows,
                    paymentMethods: paymentMethodsResult.rows,
                    ...user
                });
        } catch (err) {
            console.log(err);
        }
    } else {
        res.redirect("/login");
    }
}); 

router.post('/fund-portfolio', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const { portfolio, plan, currency, amount } = req.body;
            const user_id = req.user.user_id;
            const description = `new deposit of $${amount}`;
            const status = 'pending';
            const date = new Date().toLocaleString();
            const unix_time = Math.floor(Date.now() / 1000);

            const userResult = await db.query('SELECT * FROM users WHERE user_id = $1', [user_id]);

            const email = userResult.rows[0].email;

            function generateRandomCode(length) {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                for (let i = 0; i < length; i++) {
                  result += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                return result;
            }
            
            const trx_id = generateRandomCode(10); // Generate a random code of 10 characters 

            await db.query(`
            INSERT INTO transactions (user_id, transaction_id, amount, type, status, date, unix_time, currency)
            VALUES ($1, $2, $3, 'deposit', $4, $5, $6, $7)
            RETURNING id
            `, [user_id, trx_id, amount, status, date, unix_time, currency]);

            await db.query(`INSERT INTO activities (user_id, description, portfolio_name, amount, date, status)
                    VALUES ($1, $2, $3, $4, $5, $6)`, 
            [user_id, description, portfolio, amount, date, "active"]);

            sendMail(email, 'New deposit awaiting confirmation', 'Your deposit request has been received and is awaiting confirmation. You will be contacted once our team has reviewed your account.');

            sendMail(process.env.ADMIN_EMAIL, 'New deposit awaiting confirmation', `<p>New deposit</p><p>Amount: $${amount}</p><p>From: ${email}</p>`);

            await db.query('UPDATE portfolios SET rate = $1 WHERE id = $2', [plan, portfolio]);

            res.redirect(`/invoice?currency=${currency}&amount=${amount}`);
        } catch (err) {
            console.log(err);
        }
    } else {
        res.redirect("/login");
    }
});

router.get("/bots", (req, res) => {res.render("dashboard/bots.ejs");})

router.get('/deposits', async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
        const userId = req.user.user_id; // Assuming you have user authentication and the user ID is available in req.user
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [req.user.email]);
        const user = userResult.rows[0];
        // Fetch transactions
        const result = await db.query(`
            SELECT  transactions.id, transactions.amount, transactions.status, transactions.date, portfolios.portfolio_name as portfolio_name
            FROM transactions
            INNER JOIN portfolios ON transactions.id = portfolios.id
            WHERE transactions.user_id = $1 AND transactions.type = 'deposit'
            ORDER BY transactions.id DESC
        `, [userId]);
    
        const transactions = result.rows;
    
        res.render('dashboard/deposits.ejs', { transactions, ...user });
        } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).send('Internal server error');
        }
    } else {
        res.redirect("/login");
    }
  });

// Profile update route
router.get("/updateProfile", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const result = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                res.render("dashboard/updateProfile.ejs", { ...user });
            } else {
                res.redirect("/login");
            }
        } catch (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.redirect("/login");
    }
});

router.get('/withdrawals', async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [req.user.email]);
        const user = userResult.rows[0];
        try {
        const userId = req.user.user_id;

        const transactionsResult = await db.query(`
            SELECT transactions.transaction_id, transactions.amount, transactions.status, transactions.date, portfolios.portfolio_name as portfolio_name
            FROM transactions
            INNER JOIN portfolios ON transactions.id = portfolios.id
            WHERE transactions.user_id = $1 AND transactions.type = 'withdrawal'
            ORDER BY transactions.id DESC
        `, [userId]);
        const transactions = transactionsResult.rows;
        res.render('dashboard/withdrawals.ejs', { transactions, ...user });
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).send('Internal server error');
    }
    } else {
        res.redirect('/login');
    }
});


export default router;