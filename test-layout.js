import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  
  // Wait for React to render
  await page.waitForSelector('#premium');
  
  const layout = await page.evaluate(() => {
    const sections = ['experience', 'intelligence', 'premium'];
    const results = {};
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        results[id] = { height: rect.height, top: rect.top, bottom: rect.bottom };
      }
    }
    
    // Check CTA section which has no ID but is the last section before footer
    const cta = document.querySelector('section.py-40');
    if (cta) {
      const rect = cta.getBoundingClientRect();
      results['cta'] = { height: rect.height, top: rect.top, bottom: rect.bottom };
    }
    
    return results;
  });
  
  console.log(JSON.stringify(layout, null, 2));
  await browser.close();
})();
