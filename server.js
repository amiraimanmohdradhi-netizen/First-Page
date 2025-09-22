// server.js
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'localhost+3-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost+3.pem')),
};

app.prepare().then(() => {
    createServer(httpsOptions, async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    }).listen(3000, '0.0.0.0', (err) => {
        if (err) throw err;
        console.log('> Ready on https://localhost:3000');
        console.log('> To access from your phone, find your PC\'s local IP address and open https://<your-pc-ip>:3000');
    });
});