const { chromium } = require("playwright");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const CFG = require("./config");

async function send(msg) {
  await fetch(CFG.WEBHOOK_URL, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({content: msg})
  });
}

async function startServer() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await send("⚡ Entrando a Aternos...");

    await page.goto("https://aternos.org/go/");
    await page.fill("#user", CFG.ATERNOS_EMAIL);
    await page.fill("#password", CFG.ATERNOS_PASSWORD);
    await page.click("#login");

    await page.waitForTimeout(3000);
    await page.goto("https://aternos.org/server/");

    await send("▶ Iniciando servidor...");
    await page.click(".btn.btn-success");

    await page.waitForSelector(".status.online", { timeout: 180000 });
    await send("✅ Servidor ONLINE");

    await browser.close();
    return true;
  } catch (e) {
    await send("❌ Error iniciando server");
    await browser.close();
    return false;
  }
}

module.exports = { startServer };
