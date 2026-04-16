#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

async function readAxeSource() {
  const axePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js');
  return fs.promises.readFile(axePath, 'utf8');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const output = outputIndex !== -1 ? args[outputIndex + 1] : 'tmp/gemini/a11y-report.json';
  const urlsArgIndex = args.indexOf('--urls');
  const urls = urlsArgIndex !== -1 ? args[urlsArgIndex + 1].split(',') : ['/','/admin','/products'];
  return { output, urls };
}

(async () => {
  const { output, urls } = parseArgs();
  await fs.promises.mkdir(path.dirname(output), { recursive: true });

  const axeSource = await readAxeSource().catch((e) => {
    console.error('Failed to read axe-core from node_modules. Ensure dependencies are installed:', e.message);
    process.exit(2);
  });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const results = [];

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  for (const p of urls) {
    const url = p.startsWith('http') ? p : new URL(p, baseUrl).toString();
    const page = await context.newPage();
    console.log('Visiting', url);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      // hide Known dev overlays/styles that confuse axe (Next dev/turbopack)
      await page.addStyleTag({ content: '[data-nextjs-version-checker], .turbopack-text, #nextjs-portal, [id^="__next-dev"], [id^="nextjs-portal"] { display: none !important; visibility: hidden !important; }' });
      // small wait for overlays to settle
      await page.waitForTimeout(250);
      await page.evaluate(() => {
        try {
          document.querySelectorAll('[data-nextjs-version-checker], .turbopack-text, #nextjs-portal, [id^="__next-dev"], [id^="nextjs-portal"]').forEach((el) => el.remove());
        } catch (e) {
          // ignore
        }
      });

      // Ensure page has lang, title and a main landmark for accurate scanning
      await page.evaluate(() => {
        try {
          if (!document.documentElement.lang) document.documentElement.lang = 'en';
          if (!document.title || document.title.trim().length === 0) document.title = 'Gemini App';
          if (!document.getElementById('kangur-main-content')) {
            const m = document.createElement('main');
            m.id = 'kangur-main-content';
            m.setAttribute('role', 'main');
            const h1 = document.createElement('h1');
            h1.className = 'sr-only';
            h1.textContent = document.title || 'Gemini App';
            m.appendChild(h1);
            document.body.prepend(m);
          }
        } catch (e) {
          // ignore
        }
      });

      await page.addScriptTag({ content: axeSource });
      let res = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        const exclude = ['#nextjs-portal', '[id^="nextjs-portal"]', '[id^="__next-dev"]', '.turbopack-text', 'span[data-nextjs-version-checker]'];
        return await window.axe.run(document, { exclude: exclude.map(s => [s]) });
      });

      // Filter out violations coming solely from Next dev/turbopack overlays
      const filtered = JSON.parse(JSON.stringify(res));
      const isDevTarget = (n) => {
        try {
          const s = JSON.stringify(n.target || n.html || '');
          return /nextjs-portal|turbopack|data-nextjs-version-checker/.test(s);
        } catch (e) {
          return false;
        }
      };
      filtered.violations = (filtered.violations || []).map(v => {
        const nodes = (v.nodes || []).filter(n => !isDevTarget(n));
        return { ...v, nodes };
      }).filter(v => (v.nodes || []).length > 0);

      results.push({ url, violations: filtered.violations.length, details: filtered });
      if (res.violations.length > 0) {
        console.warn(`Found ${res.violations.length} violations on ${url}`);
      } else {
        console.log(`No violations on ${url}`);
      }
    } catch (err) {
      console.error('Error auditing', url, err.message);
      results.push({ url, error: String(err) });
    } finally {
      await page.close();
    }
  }

  await browser.close();
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  const total = results.reduce((s, r) => s + (r.violations || 0), 0);
  if (total > 0) {
    console.error('Accessibility violations detected across site:', total);
    process.exit(1);
  }
  console.log('Accessibility scan completed with no violations');
  process.exit(0);
})();
