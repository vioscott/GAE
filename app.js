
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
import fs from "fs";
import path from "path";
import db from './config/db.js';

dotenv.config();

// Function to execute SQL file
const executeSQLFile = async (filePath) => {
    const sql = fs.readFileSync(filePath).toString();
    try {
        await db.query(sql);
        console.log(`${filePath} executed successfully.`);
    } catch (err) {
        console.error(`Error executing ${filePath}:`, err);
    }
};

// Initialize the database schema
const initDB = async () => {
    const schemaPath = path.resolve(process.cwd(), 'sql', 'schema.sql');
    await executeSQLFile(schemaPath);
};

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


// Initialize DB and start server
initDB().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Error initializing database:', err);
});
