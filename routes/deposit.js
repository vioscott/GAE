import express from 'express';
import db from '../config/db.js';
import QRCode from 'qrcode';
const router = express.Router();


router.post('/fund', async (req, res) => {
    if (req.isAuthenticated()) {
        const userId = req.user.user_id;
        const { amount, portfolio, currency, plan } = req.body;
        const description = `new deposit of $${amount}`;
        const date = new Date().toLocaleDateString();
        const unixTime = Math.floor(Date.now() / 1000);
        const status = 'pending';
        const email = req.user.email;
        const adminEmail = process.env.ADMIN_EMAIL; // Your admin email

        try {
            // Update portfolio plan
            const portfolioResult = await db.query("SELECT * FROM portfolios WHERE id = $1", [portfolio]);
            await db.query('UPDATE portfolios SET rate = $1 WHERE id = $2', [plan, portfolio]);
            const name = portfolioResult.rows[0].portfolio_name;
            // Insert transaction
            const result = await db.query(
                'INSERT INTO transactions(user_id, transaction_id, amount, type, status, date, unix_time, currency) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                [userId, name, amount, 'deposit', status, date, unixTime, currency]
            );

            // Insert activity
            await db.query(
                `INSERT INTO activities (user_id, portfolio_name, amount, status, description, date)
                VALUES ($1, $2, $3, $4, $5, $6)`, 
                [userId, name, amount, status, description, date]
            );

            const trxId = result.rows[0].id;

            // Send user email
            // const userMailOptions = {
            //     from: process.env.EMAIL,
            //     to: email,
            //     subject: 'New deposit awaiting confirmation',
            //     text: 'Your deposit request has been received and is awaiting confirmation. You will be contacted once our team has reviewed your account.'
            // };

            // await transporter.sendMail(userMailOptions);

            // // Send admin email
            // const adminMailOptions = {
            //     from: process.env.EMAIL,
            //     to: adminEmail,
            //     subject: 'New deposit awaiting confirmation',
            //     html: `<p>New deposit</p>
            //         <p>Amount: ${amount}</p>
            //         <p>From: ${email}</p>`
            // };

            // await transporter.sendMail(adminMailOptions);

            // Redirect to invoice
            res.redirect(`/invoice?currency=${currency}&amount=${amount}`);
        } catch (err) {
            console.error('Error processing deposit:', err);
            res.status(500).send('Failed to process deposit. Please try again later.');
        }
    } else {
        res.status(401).send('Unauthorized');
    }
});

router.get("/invoice", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query('SELECT * FROM users WHERE email = $1', [req.user.email]);
            const { amount, currency } = req.query;

            // Query the database for the address based on the currency
            const addressResult = await db.query('SELECT address FROM addresses WHERE currency = $1', [currency]);
            if (addressResult.rows.length > 0) {
                const address = addressResult.rows[0].address;

                // Generate QR Code URL
                const qrCodeUrl = await QRCode.toDataURL(address);

                if (userResult.rows.length > 0) {
                    const user = userResult.rows[0];
                    res.render("dashboard/invoice.ejs", { ...user, address, currency, amount, qrCodeUrl });
                } else {
                    res.redirect("/login");
                }
            } else {
                res.status(404).send('Address not found for the specified currency.');
            }
        } catch (err) {
            console.error('Error generating invoice:', err);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect("/login");
    }
});


export default router;