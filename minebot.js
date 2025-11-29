const mineflayer = require("mineflayer");
const CFG = require("./config");

function startBot() {
  const bot = mineflayer.createBot({
    host: CFG.SERVER_IP,
    username: "PicolasBot",
    version: false
  });

  bot.on("spawn", () => {
    console.log("✅ Bot Mineflayer conectado");
    bot.chat("🤖 Picolas AFK activo");
  });

  bot.on("end", () => {
    console.log("⚠ Bot caído, reconectando...");
    setTimeout(startBot, 15000);
  });

  bot.on("kicked", r => console.log("Kicked:", r));
  bot.on("error", () => {});
}

module.exports = { startBot };
