const { Client, GatewayIntentBits } = require("discord.js");
const CFG = require("./config");
const net = require("net");
const { spawn } = require("child_process");
const { tellFromDiscord } = require("./minebot");
const mc = require("minecraft-server-util"); // para players/ping

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let mineProcess = null; // proceso Mineflayer

// ---- SOCKET ONLINE/OFFLINE (rápido) ----
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

// ---- COMANDOS ----
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  console.log(`📩 ${msg.author.username}: ${msg.content}`);

  // ---------- HELP ----------
  if (msg.content === "!help") {
    return msg.channel.send(
      "🤖 **PicolasAternosBot - Comandos**\n\n" +
      "🖥 **Servidor**\n" +
      "`!status` → Estado ONLINE/OFFLINE\n" +
      "`!start` → Abrir Aternos\n" +
      "`!players` → Jugadores online\n" +
      "`!ping` → Latencia al server\n\n" +
      "🎮 **Mineflayer**\n" +
      "`!start2` → Iniciar bot\n" +
      "`!stop2` → Detener bot\n" +
      "`!restart2` → Reiniciar bot\n" +
      "`!say <mensaje>` → Habla en el server\n\n" +
      "📖 `!help` → Este menú\n" +
      "⚡ PICOLAS"
    );
  }

  // ---------- STATUS ----------
  if (msg.content === "!status") {
    const ok = await isOnline();
    return msg.channel.send(ok ? "🟢 **Servidor ONLINE**" : `🔴 **Servidor OFFLINE**\n${CFG.START_URL || ""}`);
  }

  // ---------- PLAYERS ----------
  if (msg.content === "!players") {
    try {
      const res = await mc.status(CFG.SERVER_IP, CFG.SERVER_PORT || 25565);
      const online = res.players.online;
      const max = res.players.max;
      return msg.channel.send(`👥 **Jugadores:** ${online}/${max}`);
    } catch (e) {
      return msg.channel.send("❌ No pude obtener la lista de jugadores.");
    }
  }

  // ---------- PING ----------
  if (msg.content === "!ping") {
    try {
      const start = Date.now();
      await mc.status(CFG.SERVER_IP, CFG.SERVER_PORT || 25565);
      const ms = Date.now() - start;
      return msg.channel.send(`🏓 **Ping:** ${ms} ms`);
    } catch (e) {
      return msg.channel.send("❌ No pude medir el ping.");
    }
  }

  // ---------- START2 ----------
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

  // ---------- STOP2 ----------
  if (msg.content === "!stop2") {
    if (!mineProcess || mineProcess.killed) {
      return msg.channel.send("ℹ️ Mineflayer no está corriendo.");
    }
    mineProcess.kill();
    mineProcess = null;
    return msg.channel.send("🛑 **Mineflayer detenido**");
  }

  // ---------- RESTART2 ----------
  if (msg.content === "!restart2") {
    if (mineProcess && !mineProcess.killed) mineProcess.kill();
    mineProcess = null;

    setTimeout(() => {
      mineProcess = spawn("node", ["minebot.js"], { stdio: "inherit" });
      mineProcess.on("exit", (code) => {
        console.log("❌ Mineflayer terminó con código:", code);
        mineProcess = null;
      });
    }, 3000);

    return msg.channel.send("🔁 **Mineflayer reiniciado**");
  }

  // ---------- SAY ----------
  if (msg.content.startsWith("!say ")) {
    const text = msg.content.slice(5).trim();
    if (!text) return msg.channel.send("❗ Ejemplo: `!say hola`");
    tellFromDiscord(text);
    return msg.channel.send("✅ Mensaje enviado al servidor.");
  }

  // ---------- START (LINK ATERNOS) ----------
  if (msg.content === "!start") {
    return msg.channel.send(`👉 Abrir servidor:\n${CFG.START_URL || ""}`);
  }
});

client.login(CFG.DISCORD_TOKEN);
