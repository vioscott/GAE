import express from 'express';
import db from '../config/db.js';
import axios from 'axios';

const router = express.Router();

const fetchCryptoData = async () => {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        ids: 'bitcoin,ethereum,dogecoin,litecoin,cardano,tron,binancecoin,ripple,solana,chainlink,bitcoin-cash,polkadot,usd-coin,pancakeswap-token'
      }
    });
    return response.data;
  };


router.get("/assets", async (req, res) => {
    console.log(req.user);
    const apiKey = '69TDY0IK4H052PCS';
    const symbols = ['WTI', 'GOLD'];
    if (req.isAuthenticated()) {
        try {
            const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const cryptoData = await fetchCryptoData();

                const commodityData = await Promise.all(symbols.map(async (symbol) => {
                    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${apiKey}`;
                    const response = await axios.get(url);
                    const timeSeries = response.data['Time Series (1min)'];

                    if (!timeSeries) {
                        console.error(`No time series data for symbol: ${symbol}`);
                        return {
                            name: symbol,
                            price: 'N/A',
                            change: 'N/A',
                            image: `/images/${symbol.toLowerCase()}.jpg`
                        };
                    }

                    const latestTime = Object.keys(timeSeries)[0];
                    const latestData = timeSeries[latestTime];
                    return {
                        name: symbol,
                        price: latestData['1. open'],
                        change: ((latestData['4. close'] - latestData['1. open']) / latestData['1. open'] * 100).toFixed(2),
                        image: `/images/${symbol.toLowerCase()}.jpg`
                    };
                }));

                res.render("dashboard/assets.ejs", { ...user, crypto: cryptoData, commodities: commodityData });
            } else {
                res.redirect("/login");
            }
        } catch (err) {
            console.log(err);
            res.status(500).send('Server error');
        }
    } else {
        res.redirect("/login");
    }
});





export default router;