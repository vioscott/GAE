import csurf from 'csurf';
import rateLimit from 'express-rate-limit';

// CSRF protection
export const csrfProtection = csurf();

// Rate limiter to prevent brute-force attacks
export const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
