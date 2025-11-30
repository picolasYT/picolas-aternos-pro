const mineflayer = require("mineflayer");
const CFG = require("./config");

let bot = null;
let connecting = false;

function startBot() {
  if (connecting) return;        // evita spam de conexiones
  connecting = true;

  console.log("🚀 Iniciando Mineflayer...");

  bot = mineflayer.createBot({
    host: CFG.SERVER_IP,
    port: CFG.SERVER_PORT || 25565,
    username: "PicolasBot",
    onlineMode: false,
    keepAlive: true
  });

  bot.once("spawn", () => {
  console.log("✅ Bot conectado como PicolasBot");

  if (!greeted) {
    bot.chat("Hola, soy PicolasBot 🤖, Recuerda unirte al discord: https://discord.gg/g9ZjfNmFuY");
    greeted = true;
  }

  connecting = false;

    // Anti-AFK suave (opcional)
    setInterval(() => {
      if (!bot || !bot.entity) return;
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 300);
    }, 30000);
  });

  bot.on("kicked", (reason) => {
    console.log("⚠ Kicked:", reason);
  });

  bot.on("end", () => {
    console.log("⚠ Desconectado. Reintentando en 60s...");
    connecting = false;
    setTimeout(startBot, 60000);  // reconexión lenta y estable
  });

  bot.on("error", (err) => {
    console.log("❌ Error:", err.message);
  });
}

// Mantener vivo el proceso Node (evita que "termine solo")
setInterval(() => {}, 1000);

startBot();
