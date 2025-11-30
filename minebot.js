const mineflayer = require("mineflayer");
const CFG = require("./config");

function startBot() {
  const bot = mineflayer.createBot({
    host: CFG.SERVER_IP,
    port: CFG.SERVER_PORT,
    username: "PicolasBot",   // ← Nombre del bot
    onlineMode: false         // ← IMPORTANTE para cracked
  });

  bot.on("spawn", () => {
    console.log("🤖 Bot conectado como PicolasBot");
    bot.chat("Hola, soy PicolasBot 🤖");
  });

  bot.on("end", () => {
    console.log("⚠ Desconectado, reintentando...");
    setTimeout(startBot, 15000);
  });

  bot.on("error", err => console.log("Error:", err));
}

startBot();
