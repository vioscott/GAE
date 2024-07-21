import express from 'express';
import multer from 'multer';
import db from '../config/db.js';
import path from "path";
import { check, validationResult } from 'express-validator';

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Ensure this folder exists
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get("/profile", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const result = await db.query(
                `SELECT * FROM users WHERE email = $1`,
                [req.user.email], 
            );
            const username = result.rows[0].username;
            const email = result.rows[0].email;
            const organization = result.rows[0].organization;
            const full_name = result.rows[0].full_name;
            const phone_number = result.rows[0].phone_number;
            const address = result.rows[0].address;
            const city = result.rows[0].city;
            const zip_code = result.rows[0].zip_code;
            const wallet_address = result.rows[0].wallet_address;
            const profile_picture = result.rows[0].profile_picture;
            if (username) {
                res.render("dashboard/profile.ejs", { username: username , 
                    email: email , full_name: full_name, 
                    phone_number: phone_number, address: address, 
                    city: city, zip_code: zip_code, wallet_address: wallet_address, 
                    organization: organization , profile_picture: profile_picture
                });
            }
        } catch (err) {
            console.log(err);
        }
    } else {
        res.redirect("/login");
    }
});

router.get("/create-portfolio", async (req, res) => {
    console.log(req.user);

    if (req.isAuthenticated()) {
        const ticker = req.query.ticker;
        if (!ticker) {
            return res.redirect('/assets');
        }

        try {
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const plansResult = await db.query("SELECT * FROM iv_schemes WHERE active='yes'");
                const paymentMethodsResult = await db.query("SELECT * FROM payment_methods WHERE active='yes'");

                res.render('dashboard/create-portfolio.ejs', {
                    ticker: ticker,
                    plans: plansResult.rows,
                    paymentMethods: paymentMethodsResult.rows,
                    ...user
                });
            } else {
                res.redirect('/login');
            }
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    } else {
        res.redirect("/login");
    }
});


router.post('/create', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const user_id = req.user.user_id;
            const { plan, amount, name, curr, address } = req.body;
            const date = new Date().toISOString().split('T')[0];
            const unix_time = Math.floor(Date.now() / 1000);
            const ticker = req.session.ticker;
            const description = "New portfolio created";

            // Insert portfolio query
            await db.query(`
                INSERT INTO portfolios (user_id, portfolio_name, description, amount, rate, save_pro, created_at, unix_time, ticker, curr, address)
                VALUES ($1, $2, $3, $4, $5, 'no', $6, $7, $8, $9, $10)
                RETURNING id
            `, [user_id, name, description, amount, plan, date, unix_time, ticker, curr, address]);

            // Create activity entry
            await db.query(`INSERT INTO activities (user_id, description, portfolio_name, amount, date, status)
                    VALUES ($1, $2, $3, $4, $5, $6)`, 
            [user_id, description, name, amount, date, "active"]);

            res.send("<script>swal('Great','We have received your request. you\'ll be contacted soon','success');</script>");
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    } else {
        res.redirect("/login");
    }
});



// Save profile changes
router.post("/save_changes", upload.single('fileToUpload'), async (req, res) => {
    const { username, fullName, organization, phone, address, city, zip, wallet } = req.body;
    const profile_picture = req.file ? req.file.path : req.body.profile_picture;
    if (req.isAuthenticated()) {
        try {
            await db.query(`
                UPDATE users 
                SET username = $1, organization = $2, phone_number = $3, address = $4, city = $5, zip_code = $6, wallet_address = $7, profile_picture = $8, full_name = $9 
                WHERE email = $10
            `, [username, organization, phone, address, city, zip, wallet, profile_picture, fullName, req.user.email]);

            res.redirect("/updateProfile");
        } catch (err) {
            console.error(err);
            res.status(500).send("Failed to update profile. Please try again later.");
        }
    }
});

export default router;