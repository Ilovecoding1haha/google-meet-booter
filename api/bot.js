import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  const code = String(req.query.code || '').replace(/[^a-z-]/gi, '');
  const name = String(req.query.name || 'Guest').slice(0, 60);
  const msg = String(req.query.msg || '').slice(0, 200);
  const hold = Math.min(Number(req.query.hold) || 40, 270);
  if (!code) return res.status(400).json({ ok: false, error: 'missing code' });

  let browser;
  try {
    browser = await pw.launch({
      args: [...chromium.args,
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-blink-features=AutomationControlled'],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const ctx = await browser.newContext({
      userAgent: UA,
      locale: 'en-US',
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 800 }
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = await ctx.newPage();
    await page.goto(`https://meet.google.com/${code}?hl=en`, {
      waitUntil: 'domcontentloaded', timeout: 45000
    });
    await page.waitForTimeout(4000);

    for (const label of ['Turn off camera', 'Turn off microphone']) {
      try {
        const b = page.locator(`button[aria-label*="${label}" i]`).first();
        if (await b.count()) await b.click({ timeout: 2000 });
      } catch {}
    }

    let typed = false;
    for (const sel of ['input[placeholder*="name" i]', 'input[type="text"]']) {
      try {
        const i = page.locator(sel).first();
        if (await i.count()) { await i.fill(name, { timeout: 6000 }); typed = true; break; }
      } catch {}
    }

    let joined = false;
    for (const t of ['Ask to join', 'Join now', 'Join']) {
      try {
        const b = page.locator(`button:has-text("${t}")`).first();
        if (await b.count()) { await b.click({ timeout: 8000 }); joined = true; break; }
      } catch {}
    }

    const deadline = Date.now() + hold * 1000;
    await page.waitForTimeout(9000);

    if (msg && joined) {
      try {
        const chat = page.locator('button[aria-label*="Chat" i]').first();
        if (await chat.count()) {
          await chat.click({ timeout: 4000 });
          await page.waitForTimeout(1200);
          const ta = page.locator('textarea').first();
          await ta.fill(msg, { timeout: 6000 });
          await ta.press('Enter');
        }
      } catch {}
    }

    while (Date.now() < deadline) await page.waitForTimeout(3000);

    return res.status(200).json({ ok: true, name, typed, joined });
  } catch (e) {
    return res.status(200).json({ ok: false, name, error: String(e).slice(0, 200) });
  } finally {
    try { await browser?.close(); } catch {}
  }
}
