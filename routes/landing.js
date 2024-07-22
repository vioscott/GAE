import express from 'express';
import axios from 'axios';
import swal from "sweetalert";
import db from '../config/db.js';

const router = express.Router();


const getCryptoData = async () => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                ids: 'bitcoin,ethereum,cardano,chainlink,shiba-inu,xrp,tron,litecoin,uniswap'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        return [];
    }
};

router.get('/', async (req, res) => {
    const cryptoData = await getCryptoData();
    res.render('index.ejs', { crypto: cryptoData });
});
// router.get("/", (req, res) => res.render("index.ejs"));
router.get("/privacy", (req, res) => res.render("privacy-policy.ejs"));
router.get("/fees", (req, res) => res.render("fees.ejs"));
router.get("/about", (req, res) => res.render("about.ejs"));
router.get("/contact", (req, res) => res.render("contact.ejs"));
router.get("/registered", (req, res) => res.render("registered.ejs"));
router.get("/news", (req, res) => res.render("news.ejs"));
router.get("/terms", (req, res) => res.render("terms.ejs"));


router.get("/forgot-password", (req, res) => res.render("forgot-password.ejs"));

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const otp = user.otp;
            const resetLink = `https://${process.env.SITE_URL}/reset-pasword?id=${otp}&email=${email}`;

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'vionyedikachi@gmail.com',
                    pass: 'Elevation10+',
                },
            });

            const mailOptions = {
                from: 'vionyedikachi@gmail.com',
                to: email,
                subject: 'Password reset confirmation',
                html: `
                    <p>The password for your account has been reset. Please follow the link below to enter your new password:</p>
                    <p><a href="${resetLink}"><button style="border: 1px solid #fb414f; background-color: #fb414f; color: #fff; text-decoration: none; font-size: 18px; padding: 10px 20px;">Reset password</button></a></p>
                `,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return res.send(`
                        <script>
                            swal('Error', 'There was an error sending the email. Please try again later.', 'error');
                        </script>
                    `);
                } else {
                    return res.send(`
                        <script>
                            swal('Success', 'We have sent instructions to ${email} on how to reset your password.', 'success');
                        </script>
                    `);
                }
            });
        } else {
            return res.send(`
                <script>
                    swal('Sorry', 'This email is not linked to any account', 'warning');
                </script>
            `);
        }
    } catch (error) {
        console.error(error);
        return res.send(`
            <script>
                swal('Error', 'Something went wrong. Please try again later.', 'error');
            </script>
        `);
    }
});

router.get('/reset-password', (req, res) => {
    const { id, email } = req.query;
    db.query('SELECT * FROM users WHERE email = $1', [email], (err, result) => {
        if (err) {
            console.error(err);
            return res.redirect('/login');
        }

        if (result.rows.length > 0 && result.rows[0].otp === id) {
            res.render('dashboard/newpassword.ejs', { email });
        } else {
            res.redirect('/login');
        }
    });
});

router.post('/reset-password', async (req, res) => {
    const { password, cpassword, email } = req.body;

    if (password !== cpassword) {
        return res.send(`<script>swal('Error', 'Passwords must be the same', 'error');</script>`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = [...Array(8)].map(() => Math.random().toString(36)[2]).join('');

    db.query('UPDATE users SET password = $1, otp = $2 WHERE email = $3', [hashedPassword, otp, email], (err) => {
        if (err) {
            console.error(err);
            return res.send(`<script>swal('Error', 'Something went wrong. Please try again later.', 'error');</script>`);
        }

        req.session.user_id = result.rows[0].id;
        req.session.email = email;

        const message = 'Congrats, your password has been reset. You can now log in to your dashboard.';
        sendMail(email, 'Password reset completed', message);

        res.send(`<script>swal('Success', 'Your password has been reset', 'success');</script>`);
    });
});

export default router;