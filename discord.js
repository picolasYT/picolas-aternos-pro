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

let mineProcess = null; // para controlar Mineflayer

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

client.once("ready", () => {
  console.log("🤖 Discord bot listo");
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  console.log(`📩 ${msg.author.username}: ${msg.content}`);

  // ---- STATUS ----
  if (msg.content === "!status") {
    const ok = await isOnline();
    return msg.channel.send(ok ? "🟢 Servidor ONLINE" : `🔴 Servidor OFFLINE\n${CFG.START_URL || ""}`);
  }

  // ---- START2: Iniciar Mineflayer ----
  if (msg.content === "!start2") {
    if (mineProcess && !mineProcess.killed) {
      return msg.channel.send("⚠️ Mineflayer ya está en ejecución.");
    }

    mineProcess = spawn("node", ["minebot.js"], { stdio: "inherit" });

    mineProcess.on("exit", (code) => {
      console.log("❌ Mineflayer terminó con código:", code);
      mineProcess = null;
    });

    return msg.channel.send("🟢 **Mineflayer iniciado**");
  }

  // ---- STOP2: Detener Mineflayer ----
  if (msg.content === "!stop2") {
    if (!mineProcess || mineProcess.killed) {
      return msg.channel.send("ℹ️ Mineflayer no está corriendo.");
    }
    mineProcess.kill();
    mineProcess = null;
    return msg.channel.send("🛑 **Mineflayer detenido**");
  }

  // ---- SAY: habla en Minecraft ----
  if (msg.content.startsWith("!say ")) {
    const text = msg.content.slice(5).trim();
    if (!text) return msg.channel.send("❗ Escribí un mensaje. Ej: `!say hola`");
    tellFromDiscord(text);
    return msg.channel.send("✅ Mensaje enviado al servidor.");
  }

  // ---- START (solo link Aternos) ----
  if (msg.content === "!start") {
    return msg.channel.send(`👉 Abrir servidor:\n${CFG.START_URL || ""}`);
  }

});

client.login(CFG.DISCORD_TOKEN);
