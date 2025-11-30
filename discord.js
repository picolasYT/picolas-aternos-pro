const { Client, GatewayIntentBits } = require("discord.js");
const CFG = require("./config");
const net = require("net");
const { spawn } = require("child_process");
const { tellFromDiscord } = require("./minebot");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let mineProcess = null;

// --------------------
function isOnline() {
  return new Promise(resolve => {
    const s = new net.Socket();
    s.setTimeout(3000);
    s.on("connect", () => { s.destroy(); resolve(true); });
    s.on("timeout", () => { s.destroy(); resolve(false); });
    s.on("error", () => resolve(false));
    s.connect(CFG.SERVER_PORT || 25565, CFG.SERVER_IP);
  });
}
// --------------------

client.once("ready", () => {
  console.log("🤖 Discord bot listo");
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  console.log(`📩 ${msg.author.username}: ${msg.content}`);

  // ✅ HELP (PRIMERO SIEMPRE)
  if (msg.content === "!help") {
    return msg.channel.send(
      "🤖 **PicolasAternosBot**\n\n" +
      "🟢 `!status` → Ver estado del servidor\n" +
      "🚀 `!start` → Abrir panel Aternos\n\n" +
      "🎮 **Minecraft Bot**\n" +
      "▶ `!start2` → Iniciar Mineflayer\n" +
      "⏹ `!stop2` → Detener Mineflayer\n" +
      "📢 `!say <texto>` → Enviar mensaje\n\n" +
      "📌 `!help` → Este menú"
    );
  }

  // ✅ STATUS
  if (msg.content === "!status") {
    const ok = await isOnline();
    return msg.channel.send(ok ? "🟢 Servidor ONLINE" : "🔴 Servidor OFFLINE");
  }

  // ✅ START2
  if (msg.content === "!start2") {
    if (mineProcess && !mineProcess.killed) {
      return msg.channel.send("⚠️ Mineflayer ya está activo.");
    }

    mineProcess = spawn("node", ["minebot.js"], { stdio: "inherit" });

    mineProcess.on("exit", (code) => {
      console.log("❌ Mineflayer cerrado:", code);
      mineProcess = null;
    });

    return msg.channel.send("✅ Mineflayer iniciado.");
  }

  // ✅ STOP2
  if (msg.content === "!stop2") {
    if (!mineProcess || mineProcess.killed) {
      return msg.channel.send("ℹ️ Mineflayer no está activo.");
    }
    mineProcess.kill();
    mineProcess = null;
    return msg.channel.send("🛑 Mineflayer detenido.");
  }

  // ✅ SAY
  if (msg.content.startsWith("!say ")) {
    const text = msg.content.slice(5).trim();
    if (!text) return msg.channel.send("❗ Ejemplo: `!say hola`");
    tellFromDiscord(text);
    return msg.channel.send("✅ Enviado.");
  }

  // ✅ START LINK
  if (msg.content === "!start") {
    return msg.channel.send(CFG.START_URL || "https://aternos.org");
  }

});

client.login(CFG.DISCORD_TOKEN);
