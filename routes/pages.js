import express from 'express';
import db from '../config/db.js';
import axios from 'axios';


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
                SELECT *
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
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const userId = user.user_id;
                const portfoliosResult = await db.query("SELECT * FROM portfolios WHERE user_id = $1", [userId]);

                res.render("dashboard/fund.ejs", { portfolios: portfoliosResult.rows, ...user });

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


router.get('/portfolio-details/:id', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const portfolioId = req.params.id
            const result = await db.query("SELECT rate, amount, curr FROM portfolios WHERE portfolio_id = $1", [portfolioId]);
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
                console.log(result);
            } else {
                res.status(404).json({ error: 'Portfolio not found' });
            }
        } catch (err) {
            console.error('Error fetching portfolio details:', err);
            res.status(500).json({ error: 'Internal server error' });
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