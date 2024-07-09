import express from 'express';
import axios from 'axios';

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
router.get("/forgot-password", (req, res) => res.render("forgot-password.ejs"));
router.get("/news", (req, res) => res.render("news.ejs"));
router.get("/terms", (req, res) => res.render("terms.ejs"));

export default router;