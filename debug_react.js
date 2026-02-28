const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
    page.on('requestfailed', request => {
        console.error('Request failed:', request.url(), request.failure().errorText);
    });
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
