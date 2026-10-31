import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  const code = String(req.query.code || '').replace(/[^a-z-]/gi, '');
  const name = String(req.query.name || 'Guest').slice(0, 60);
  const msg = String(req.query.msg || '').slice(0, 200);
  const hold = Math.min(Math.max(Number(req.query.hold) || 30, 15), 270);
  if (!code) return res.status(400).json({ ok: false, stage: 'input' });

  let browser, stage = 'boot';
  try {
    const args = chromium.args.filter(a => !a.startsWith('--single-process'));
    args.push(
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-blink-features=AutomationControlled'
    );

    browser = await pw.launch({
      args,
      executablePath: await chromium.executablePath(),
      headless: true
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

    stage = 'load';
    const page = await ctx.newPage();
    await page.goto(`https://meet.google.com/${code}?hl=en`, {
      waitUntil: 'domcontentloaded', timeout: 45000
    });
    await page.waitForTimeout(4000);

    stage = 'prejoin';
    for (const label of ['Turn off camera', 'Turn off microphone']) {
      try {
        const b = page.locator(`button[aria-label*="${label}" i]`).first();
        if (await b.count()) await b.click({ timeout: 2000 });
      } catch {}
    }

    for (const sel of ['input[placeholder*="name" i]', 'input[aria-label*="name" i]']) {
      try {
        const i = page.locator(sel).first();
        if (await i.count()) { await i.fill(name, { timeout: 6000 }); break; }
      } catch {}
    }

    stage = 'click';
    let clicked = false;
    for (const t of ['Ask to join', 'Join now', 'Join']) {
      try {
        const b = page.locator(`button:has-text("${t}")`).first();
        if (await b.count()) { await b.click({ timeout: 8000 }); clicked = true; break; }
      } catch {}
    }
    if (!clicked) {
      return res.status(200).json({ ok: false, stage: 'no-button', name });
    }

    const deadline = Date.now() + hold * 1000;
    await page.waitForTimeout(9000);

    stage = 'joined';
    if (msg) {
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
    return res.status(200).json({ ok: true, stage, name });
  } catch (e) {
    return res.status(200).json({ ok: false, stage, name, error: String(e).slice(0, 160) });
  } finally {
    try { await browser?.close(); } catch {}
  }
}
