// Headless script: check computed color of limit_up stock names
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222'
  }).catch(() => null);
  if (!browser) {
    console.log('No browser at 9222, launching edge');
    return;
  }
  const page = await browser.newPage();
  await page.goto('https://aikanpan.top/', { waitUntil: 'networkidle0' });
  const data = await page.evaluate(() => {
    // Find all elements with class "truncate text-[var(--text-primary)]" inside limit_up area
    const all = document.querySelectorAll('span.truncate');
    return Array.from(all).slice(0, 10).map(el => {
      const cs = window.getComputedStyle(el);
      return {
        text: el.textContent,
        color: cs.color,
        opacity: cs.opacity,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        parentTag: el.parentElement?.parentElement?.tagName,
        parentClass: el.parentElement?.parentElement?.className?.slice(0, 80)
      };
    });
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.disconnect();
})();
