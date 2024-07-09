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
            const userId = req.user.id; // Adjust based on how you store the user ID
            const balanceResult = await db.query("SELECT SUM(balance) AS balance FROM portfolios WHERE user_id = $1", [userId]);
            const portfoliosResult = await db.query("SELECT * FROM portfolios WHERE user_id = $1", [userId]);
            const botsResult = await db.query("SELECT * FROM bots");
            const paymentMethodsResult = await db.query("SELECT * FROM payment_methods");
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            const user = userResult.rows[0];

            const portfolios = portfoliosResult.rows; // fetch all rows
            const bots = botsResult.rows;
            const paymentMethods = paymentMethodsResult.rows;

            const summaryQuery = `
            SELECT 
                SUM(balance) AS total_balance, 
                COUNT(*) AS total_portfolios, 
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_portfolios, 
                SUM(CASE WHEN status = 'settled' THEN 1 ELSE 0 END) AS settled_portfolios 
            FROM portfolios 
            WHERE user_id = $1`;

            const summaryValues = [userId];

            const summaryResult = await db.query(summaryQuery, summaryValues);
            const { total_balance, total_portfolios, active_portfolios, settled_portfolios } = summaryResult.rows[0];

            res.render('dashboard/portfolios.ejs', {
                portfolios,
                availablePortfolios: portfolios.filter(p => p.bot === 0),
                bots,
                paymentMethods, 
                ...user,
                balance: total_balance,
                num_portfolio: total_portfolios,
                num_active_portfolio: active_portfolios,
                num_settled_portfolio: settled_portfolios
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

router.get("/deposits", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query('SELECT * FROM users WHERE email = $1', [req.user.email]);
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
                res.render("dashboard/deposits.ejs", { username: user.username , 
                    email: user.email , full_name: user.full_name, 
                    phone_number: user.phone_number, address: user.address, 
                    city: user.city, zip_code: user.zip_code, wallet_address: user.wallet_address, 
                    organization: user.organization , profile_picture: user.profile_picture
                });
            }
        } catch (err) {
            console.log(err);
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

router.get("/withdrawals", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query('SELECT * FROM users WHERE email = $1', [req.user.email]);
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
                res.render("dashboard/withdrawals.ejs", { username: user.username , 
                    email: user.email , full_name: user.full_name, 
                    phone_number: user.phone_number, address: user.address, 
                    city: user.city, zip_code: user.zip_code, wallet_address: user.wallet_address, 
                    organization: user.organization , profile_picture: user.profile_picture
                });
            }
        } catch (err) {
            console.log(err);
        }
    } else {
        res.redirect("/login");
    }
});




export default router;