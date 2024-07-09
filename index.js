import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import dotenv from "dotenv";
import flash from "connect-flash";
import multer from "multer";
import path from "path";
import inquirer from "inquirer";
import qr from "qr-image";
import fs from "fs";

// Initialize dotenv to manage environment variables
dotenv.config();

const app = express();
const port = 3000;
const saltRounds = 10;

// Middleware setup
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true,
}));

app.use(flash());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect().catch(err => console.error("Error connecting to the database:", err));

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });


// inquirer
//     .prompt([
//         {message: "Type in Your URL: ",
//             name: "URL"
//         }
//     ])
//     .then((answers) => {
//         const url = answers.URL;
//         var qr_svg = qr.image(url);
//         qr_svg.pipe(fs.createWriteStream('qr_img.png'));

//         fs.writeFile("URL.txt", url, (err) => {
//             if (err) throw err;
//             console.log("The file has been saved");
//         })
//     })
//     .catch((error) => {
//         if (error.isTtyError){

//         } else{

//         }
//     })

// Routes
app.get("/", (req, res) => res.render("index.ejs"));
app.get("/register", (req, res) => res.render("register.ejs"));
app.get("/privacy", (req, res) => res.render("privacy-policy.ejs"));
app.get("/fees", (req, res) => res.render("fees.ejs"));
app.get("/about", (req, res) => res.render("about.ejs"));
app.get("/contact", (req, res) => res.render("contact.ejs"));
app.get("/login", (req, res) => res.render("login.ejs"));
app.get("/registered", (req, res) => res.render("registered.ejs"));
app.get("/forgot-password", (req, res) => res.render("forgot-password.ejs"));

// Profile update route
app.get("/updateProfile", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const result = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                res.render("updateProfile.ejs", { ...user });
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

app.get("/profile", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const result = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                res.render("profile.ejs", { ...user });
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

// Save profile changes
app.post("/save_changes", upload.single('fileToUpload'), async (req, res) => {
    const { username, fullName, organization, phone, address, city, zip, wallet } = req.body;
    const profile_picture = req.file ? req.file.path : req.body.profile_picture;

    try {
        await db.query(`
            UPDATE users 
            SET username = $1, organization = $2, phone_number = $3, address = $4, city = $5, zip_code = $6, wallet_address = $7, profile_picture = $8, full_Name = $9 
            WHERE user_id = $10
        `, [username, organization, phone, address, city, zip, wallet, profile_picture, fullName, req.user.user_id]);

        res.redirect("/updateProfile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to update profile. Please try again later.");
    }
});
// Register route
app.post("/register", async (req, res) => {
    const { email, password, username } = req.body;
    try {
        // Check if the user already exists
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (checkResult.rows.length > 0) {
            req.flash('error', 'Email already registered. Please log in.');
            res.redirect("/login");
        } else {
            // Hash the password
            const hash = await bcrypt.hash(password, saltRounds);
            
            // Insert the new user into the users table
            const userResult = await db.query(
                "INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3) RETURNING *",
                [email, hash, username]
            );
            const user = userResult.rows[0];
            const userId = user.user_id;

            // Insert a new tables for the user

            await db.query('INSERT INTO portfolios (user_id) VALUES ($1)', [userId]);
            await db.query('INSERT INTO transactions (user_id) VALUES ($1)', [userId]);
            await db.query('INSERT INTO deposits (user_id) VALUES ($1)', [userId]);
            // await db.query('INSERT INTO  (user_id) VALUES ($1)', [userId]);

            // Log the user in
            req.login(user, (err) => {
                if (err) {
                    console.error("Login after registration failed:", err);
                    res.status(500).send("Registration successful, but login failed.");
                } else {
                    res.redirect("/registered");
                }
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to register. Please try again later.");
    }
});
// Login route
app.post("/login", passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true
}));

passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            return isValidPassword ? done(null, user) : done(null, false, { message: 'Invalid credentials' });
        } else {
            return done(null, false, { message: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        return done(err);
    }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Dashboard route
app.get("/dashboard", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const portfolioResult = await db.query("SELECT * FROM portfolios WHERE user_id = $1", [user.user_id]);
                const portfolio = portfolioResult.rows[0] || {};
                const transactionsResult = await db.query("SELECT * FROM transactions WHERE user_id = $1", [user.user_id]);
                const transactions = transactionsResult.rows[0] || {};

                res.render("dashboard.ejs", { 
                    username: user.username, 
                    balance: portfolio.balance,
                    profit: portfolio.profit,
                    deposited: portfolio.deposited,
                    ref_bonus: portfolio.ref_bonus,
                    trades: portfolio.trades,
                    profile_picture: user.profile_picture,
                    description: transactions.description,
                    amount: transactions.amount,
                    transaction_status: transactions.transaction_status,
                    date: transactions.date,
                    portfolio_name: portfolio.portfolio_name,
                    transactions: transactions
                });
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
app.get("/assets", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];

                res.render("assets.ejs", { ...user
                });
            }
        } catch (err) {
            console.log(err);
        }
    } else {
        res.redirect("/login");
    }
});
app.get("/portfolios", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const portfolioResult = await db.query("SELECT * FROM portfolios WHERE user_id = $1", [user.user_id]);
                const portfolio = portfolioResult.rows[0] || {};

                res.render("portfolios.ejs", { 
                    username: user.username, 
                    balance: portfolio.balance,
                    profit: portfolio.profit,
                    deposited: portfolio.deposited,
                    ref_bonus: portfolio.ref_bonus,
                    trades: portfolio.trades,
                    profile_picture: user.profile_picture
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

app.get("/activities", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const portfolioResult = await db.query("SELECT * FROM portfolios WHERE user_id = $1", [user.user_id]);
                const portfolio = portfolioResult.rows[0] || {};
                const activitiesResult = await db.query("SELECT * FROM activities WHERE user_id = $1", [user.user_id]);
                const activities = activitiesResult.rows[0] || {};

                res.render("activities.ejs", { 
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
                    portfolio_name: portfolio.portfolio_name
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


app.get("/fund", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const portfolioResult = await db.query("SELECT * FROM portfolios WHERE user_id = $1", [user.user_id]);
                const portfolio = portfolioResult.rows[0] || {};

                res.render("fund.ejs", { 
                    username: user.username, 
                    balance: portfolio.balance,
                    profit: portfolio.profit,
                    deposited: portfolio.deposited,
                    ref_bonus: portfolio.ref_bonus,
                    trades: portfolio.trades,
                    profile_picture: user.profile_picture
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

app.get("/bots", (req, res) => {
    res.render("bots.ejs");
})

app.get("/deposits", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const result = await db.query(
                `SELECT * FROM users WHERE email = $1`,
                [req.user.email]
            );
            const username = result.rows[0].username;
            if (username) {
                res.render("deposits.ejs", { username: username , 
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

app.get("/withdrawals", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const result = await db.query(
                `SELECT * FROM users WHERE email = $1`,
                [req.user.email]
            );
            const username = result.rows[0].username;
            if (username) {
                res.render("withdrawals.ejs", { username: username });
            }
        } catch (err) {
            console.log(err);
        }
    } else {
        res.redirect("/login");
    }
});

app.get("/profile", async (req, res) => {
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
                res.render("profile.ejs", { username: username , 
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

app.get("/create-portfolio", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const result = await db.query(
                `SELECT * FROM users WHERE email = $1`,
                [req.user.email]
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
                res.render("create-portfolio.ejs", { username: username , 
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

app.post("/create-portfolio", async (req, res) => {
    const { name, plan, amount, curr, address } = req.body;
    const userId = req.user.user_id; // Assuming you have user_id stored in req.user after authentication

    try {
        const query = `
            INSERT INTO portfolios (user_id, name, plan, amount, currency, address)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const values = [userId, name, plan, amount, curr, address];

        await db.query(query, values);
        console.log("Portfolio created successfully");

        // Redirect to updateProfile or any other appropriate route
        res.redirect("/updateProfile");
    } catch (err) {
        console.error("Error creating portfolio:", err);
        res.status(500).send("Failed to create portfolio. Please try again later.");
    }
});


app.post('/fund', async (req, res) => {
    if (req.isAuthenticated()){
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
            await db.query('UPDATE portfolios SET rate = $1 WHERE id = $2', [plan, portfolio]);

            // Insert transaction
            const result = await db.query(
                'INSERT INTO transactions(user_id, folio_id, amount, type, status, date, unix_time, currency) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                [userId, portfolio, amount, 'deposit', status, date, unixTime, currency]
            );

            const trxId = result.rows[0].id;

            // Create activity (assuming createActivity is a function you have)
            await createActivity(userId, description, portfolio, amount, date, currency, trxId);

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

            // Redirect to invoice
            res.redirect(`/invoice?slug=${currency}&amount=${amount}`);
        } catch (err) {
            console.error('Error processing deposit:', err);
            res.status(500).send('Failed to process deposit. Please try again later.');
        }
    }
});

app.get("/news", (req, res) => {
    res.render("news.ejs");
})

app.get("/invoice", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const walletsResult = await db.query("SELECT * FROM wallets WHERE user_id = $1", [user.user_id]);
                const wallets = walletsResult.rows[0] || {};

                res.render("fund-details.ejs", { 
                    username: user.username,
                    profile_picture: user.profile_picture,
                    eth_address: wallets.eth,
                    btc_address: wallets.btc,
                    usdt_address: wallets.usdt
                });
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

app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) {
        return next(err);
        }
        res.redirect("/");
    });
});

// Define other routes similarly with proper authentication checks and error handling

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
