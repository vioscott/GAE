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
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import csurf from "csurf";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

// Middleware setup
app.use(helmet()); // Security headers
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true,
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

const csrfProtection = csurf();
app.use(csrfProtection);

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect().catch(err => console.error("Error connecting to the database:", err));

// Rate limiter to prevent brute-force attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// Passport configuration
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

// Utility function to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
};

// Routes
app.get("/", (req, res) => res.render("index.ejs"));
app.get("/register", (req, res) => res.render("register.ejs", { csrfToken: req.csrfToken() }));
app.get("/login", (req, res) => res.render("login.ejs", { csrfToken: req.csrfToken() }));
app.get("/profile", isAuthenticated, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.render("profile.ejs", { ...user, csrfToken: req.csrfToken() });
        } else {
            res.redirect("/login");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/register", async (req, res) => {
    const { email, password, username } = req.body;
    try {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (checkResult.rows.length > 0) {
            req.flash('error', 'Email already registered. Please log in.');
            res.redirect("/login");
        } else {
            const hash = await bcrypt.hash(password, saltRounds);
            const userResult = await db.query(
                "INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3) RETURNING *",
                [email, hash, username]
            );
            const user = userResult.rows[0];
            await db.query(
                "INSERT INTO portfolios (user_id, portfolio_name, balance, profit, deposited, ref_bonus, trades) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [user.user_id, 'Default Portfolio', 0, 0, 0, 0, 0]
            );
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

app.post("/login", passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true
}));

app.get("/dashboard", isAuthenticated, async (req, res) => {
    try {
        const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const portfolioResult = await db.query("SELECT * FROM portfolios WHERE user_id = $1", [user.user_id]);
            const portfolio = portfolioResult.rows[0] || {};
            res.render("dashboard.ejs", { 
                username: user.username, 
                balance: portfolio.balance,
                profit: portfolio.profit,
                deposited: portfolio.deposited,
                ref_bonus: portfolio.ref_bonus,
                trades: portfolio.trades,
                profile_picture: user.profile_picture,
                csrfToken: req.csrfToken()
            });
        } else {
            res.redirect("/login");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/save_changes", isAuthenticated, upload.single('fileToUpload'), async (req, res) => {
    const { username, fullName, organization, phone, address, city, zip, wallet } = req.body;
    const profile_picture = req.file ? req.file.path : req.body.profile_picture;

    try {
        await db.query(`
            UPDATE users 
            SET username = $1, organization = $2, phone_number = $3, address = $4, city = $5, zip_code = $6, wallet_address = $7, profile_picture = $8, full_Name = $9 
            WHERE user_id = $10
        `, [username, organization, phone, address, city, zip, wallet, profile_picture, fullName, req.user.user_id]);

        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to update profile. Please try again later.");
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

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
