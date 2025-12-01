const mineflayer = require("mineflayer");
const CFG = require("./config");

// =======================
// PLAN SaaS
// =======================
const RECONNECT_TIME = (CFG.RECONNECT_TIME || 60) * 1000; // seg → ms
const ADS_ENABLED = CFG.ADS_ENABLED === true;
const PLAN = CFG.PLAN || "FREE";

let bot = null;
let connecting = false;
let greeted = false;
let reconnectTimeout = null;
let autoTimer = null;

const AUTO_INTERVAL = 5 * 60 * 1000; // 5 min

const AUTO_MESSAGES = ADS_ENABLED ? [
  "👋 Hola! Soy PicolasBot 🤖",
  "💬 Unite a nuestro Discord: https://discord.gg/VS5gS88WZf",
  "⭐ Pasate a PLAN PRO para más ventajas"
] : [];

function log(msg) {
  console.log(`[MineBot][${PLAN}] ${msg}`);
}

// =======================
// INICIAR BOT
// =======================
function startBot() {
  if (connecting) {
    log("⏳ Ya se está intentando conectar...");
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
      safeChat(`🤖 PicolasBot conectado | PLAN ${PLAN}`);
      greeted = true;
    }

    // ADS según plan
    if (ADS_ENABLED) {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(() => {
        const msg = AUTO_MESSAGES[Math.floor(Math.random() * AUTO_MESSAGES.length)];
        safeChat(msg);
      }, AUTO_INTERVAL);
    }

    // Anti-AFK
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
      log("❌ Ya está conectado desde otro lado.");
      stopBot();
    }
  });

  bot.on("end", () => {
    log("🔌 Desconectado del server");
    connecting = false;
    if (autoTimer) clearInterval(autoTimer);
    scheduleReconnect();
  });

  bot.on("error", (err) => {
    log(`❌ Error: ${err.message}`);
  });
}

// =======================
// RECONEXIÓN SEGÚN PLAN
// =======================
function scheduleReconnect() {
  if (reconnectTimeout) return;

  log(`⏱ Reintentando en ${CFG.RECONNECT_TIME || 60} segundos...`);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot();
  }, RECONNECT_TIME);
}

// =======================
// STOP
// =======================
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

// =======================
// CHAT
// =======================
function safeChat(text) {
  if (!bot || !bot.entity) return;
  try {
    bot.chat(text);
  } catch (e) {
    log("⚠ Error al enviar mensaje");
  }
}

function tellFromDiscord(message) {
  safeChat(`📣 [Discord] ${message}`);
}

module.exports = { tellFromDiscord, startBot, stopBot };

// =======================
// ✅ AUTO START
// =======================
startBot();

// Mantener proceso vivo
setInterval(() => {}, 1000);
