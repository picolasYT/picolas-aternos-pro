const mineflayer = require("mineflayer");
const CFG = require("./config");

let bot = null;
let connecting = false;
let greeted = false;
let reconnectTimeout = null;
let autoTimer = null;

const AUTO_MESSAGES = [
  "👋 Hola! Soy PicolasBot 🤖",
  "💬 Unite a nuestro Discord: https://discord.gg/VS5gS88WZf",
  "⚡ Server gracias a PicolasBot",
];
const AUTO_INTERVAL = 5 * 60 * 1000; // 5 min

function log(msg) {
  console.log(`[MineBot] ${msg}`);
}

function startBot() {
  if (connecting) {
    log("⏳ Ya se está intentando conectar, ignorado.");
    return;
  }

  connecting = true;
  clearTimeout(reconnectTimeout);

  log("🚀 Iniciando Mineflayer...");

  bot = mineflayer.createBot({
    host: CFG.SERVER_IP,
    port: CFG.SERVER_PORT || 25565,
    username: CFG.BOT_USERNAME || "PicolasBot",
    version: CFG.MC_VERSION || false,
    onlineMode: false,
    keepAlive: true
  });

  bot.once("spawn", () => {
    log(`✅ Conectado como ${bot.username}`);
    connecting = false;

    if (!greeted) {
      safeChat("Hola, soy PicolasBot 🤖 | Discord: https://discord.gg/VS5gS88WZf");
      greeted = true;
    }

    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      const msg = AUTO_MESSAGES[Math.floor(Math.random() * AUTO_MESSAGES.length)];
      safeChat(msg);
    }, AUTO_INTERVAL);

    setInterval(() => {
      if (!bot || !bot.entity) return;
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 300);
    }, 30000);
  });

  bot.on("kicked", (reason) => {
    const txt = reason?.toString() || "sin razón";
    log(`⚠ Kicked: ${txt}`);

    if (txt.includes("duplicate_login")) {
      log("❌ El bot ya está conectado desde otro lado.");
      stopBot();
    }
  });

  bot.on("end", () => {
    log("🔌 Desconectado del servidor");
    connecting = false;
    if (autoTimer) clearInterval(autoTimer);

    scheduleReconnect();
  });

  bot.on("error", (err) => {
    log(`❌ Error: ${err.message}`);
  });
}

function scheduleReconnect() {
  if (reconnectTimeout) return;

  log("⏱ Reintentando en 60 segundos...");
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot();
  }, 60000);
}

function stopBot() {
  if (autoTimer) clearInterval(autoTimer);
  if (bot) {
    try { bot.quit(); } catch {}
    bot = null;
  }
  connecting = false;
  clearTimeout(reconnectTimeout);
  reconnectTimeout = null;
}

function safeChat(text) {
  if (!bot || !bot.entity) return;
  try {
    bot.chat(text);
  } catch (e) {
    log("⚠ No se pudo enviar mensaje");
  }
}

function tellFromDiscord(message) {
  safeChat(`📣 [Discord] ${message}`);
}

module.exports = { tellFromDiscord, startBot, stopBot };

// Mantener proceso vivo
setInterval(() => {}, 1000);

// AUTO START
startBot();
