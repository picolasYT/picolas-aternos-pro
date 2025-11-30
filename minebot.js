const mineflayer = require("mineflayer");
const CFG = require("./config");

let bot = null;
let connecting = false;
let greeted = false;

// ------- CONFIG AUTO MENSAJES -------
const AUTO_MESSAGES = [
  "👋 Hola! Soy PicolasBot 🤖",
  "💬 Unite a nuestro Discord: https://discord.gg/g9ZjfNmFuY",
  "⚡ Server gracias a PicolasBot",
];
const AUTO_INTERVAL = 5 * 60 * 1000; // cada 5 minutos
let autoTimer = null;

function startBot() {
  if (connecting) return;
  connecting = true;

  console.log("🚀 Iniciando Mineflayer...");

  bot = mineflayer.createBot({
    host: CFG.SERVER_IP,
    port: CFG.SERVER_PORT || 25565,
    username: CFG.BOT_USERNAME || "PicolasBot_AFK",
    onlineMode: false,
    keepAlive: true,
  });

  bot.once("spawn", () => {
    console.log("✅ Conectado como", bot.username);
    connecting = false;

    // Saludo una sola vez
    if (!greeted) {
      safeChat("Hola, soy PicolasBot 🤖, unite al Discord: https://discord.gg/g9ZjfNmFuY");
      greeted = true;
    }

    // ---- Auto mensajes ----
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      const msg = AUTO_MESSAGES[Math.floor(Math.random() * AUTO_MESSAGES.length)];
      safeChat(msg);
    }, AUTO_INTERVAL);

    // ---- Anti-AFK suave ----
    setInterval(() => {
      if (!bot || !bot.entity) return;
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 350);
    }, 30000);
  });

  bot.on("kicked", (reason) => {
    console.log("⚠ Kicked:", reason);
  });

  bot.on("end", () => {
    console.log("⚠ Desconectado. Reintentando en 60s...");
    connecting = false;
    if (autoTimer) clearInterval(autoTimer);
    setTimeout(startBot, 60000);
  });

  bot.on("error", (err) => console.log("❌", err.message));
}

// enviar chat con protección anti-crash
function safeChat(text) {
  try {
    if (bot && bot.entity) bot.chat(text);
  } catch (e) {
    console.log("⚠ chat fail:", e.message);
  }
}

// --- Exponer para Discord (!say) ---
function tellFromDiscord(message) {
  safeChat(`📣 [Discord] ${message}`);
}

module.exports = { tellFromDiscord, startBot };

// Mantener vivo el proceso
setInterval(() => {}, 1000);
startBot();
