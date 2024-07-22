import express from 'express';
import db from '../config/db.js';
import QRCode from 'qrcode';
const router = express.Router();

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