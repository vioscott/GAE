
import express from "express";
import passport from "passport";
import session from "express-session";
import dotenv from "dotenv";
import flash from "connect-flash";


import { initPassport } from './config/passport.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import dashboardRoutes from './routes/dashboard.js';
import landingRoutes from './routes/landing.js';
import pagesRoutes from './routes/pages.js';
import depositsRoutes from './routes/deposit.js';
import withdrawRoutes from './routes/withdraw.js';
import assetsRoutes from './routes/assets.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true,
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static("public"));

// Initialize Passport
initPassport(passport);

// Routes
app.use('/', landingRoutes);
app.use('/', authRoutes);
app.use('/', profileRoutes);
app.use('/', dashboardRoutes);
app.use('/', pagesRoutes);
app.use('/', depositsRoutes);
app.use('/', withdrawRoutes);
app.use('/', assetsRoutes);


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
