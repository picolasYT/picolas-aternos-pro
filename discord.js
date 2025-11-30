const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Partials
} = require("discord.js");

const CFG = require("./config");
const net = require("net");
const { spawn } = require("child_process");
const MineBot = require("./minebot");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User]
});

let mineProcess = null;
const deploySessions = {};

// =====================
// ADMIN SISTEMA
// =====================
function isAdmin(id) {
  return CFG.ADMINS && CFG.ADMINS.includes(id);
}

function getBots() {
  if (!fs.existsSync("./bots")) return [];
  return fs.readdirSync("./bots").filter(f => fs.lstatSync(`./bots/${f}`).isDirectory());
}

function deleteUserBot(userId) {
  const path = `./bots/${userId}`;
  if (!fs.existsSync(path)) return false;
  fs.rmSync(path, { recursive: true, force: true });
  return true;
}

// =====================
// PING SERVER MC
// =====================
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

// =================
// READY
// =================
client.once("ready", () => {
  console.log("🤖 Discord bot listo como", client.user.username);
});

// =================
// MENSAJES
// =================
client.on("messageCreate", async (msg) => {

  if (!msg.guild) {
    console.log(`📩 DM de ${msg.author.username}: ${msg.content}`);
  }

  if (msg.author.bot) return;
  const text = (msg.content || "").trim();
  const userId = msg.author.id;

  console.log(`💬 ${msg.guild ? "SERVER" : "DM"} | ${msg.author.username}: ${text}`);

  // ============
  // ADMIN PANEL
  // ============

  if (text === "!adminlist") {
    if (!isAdmin(userId)) return msg.channel.send("⛔ No sos admin.");
    const bots = getBots();
    if (bots.length === 0) return msg.channel.send("⚠ No hay bots.");
    return msg.channel.send("🤖 Bots:\n" + bots.map(b => `• ${b}`).join("\n"));
  }

  if (text.startsWith("!admindelete ")) {
    if (!isAdmin(userId)) return msg.channel.send("⛔ No sos admin.");
    const id = text.split(" ")[1];
    if (!id) return msg.channel.send("Uso: `!admindelete ID`");
    const ok = deleteUserBot(id);
    return msg.channel.send(ok ? `🗑 Bot ${id} eliminado.` : "❌ No existe ese bot.");
  }

  if (text === "!adminwipe") {
    if (!isAdmin(userId)) return msg.channel.send("⛔ No sos admin.");
    const bots = getBots();
    bots.forEach(id => deleteUserBot(id));
    return msg.channel.send("🔥 Todos los bots eliminados.");
  }

  // =====================
  // BORRAR BOT PROPIO
  // =====================
  if (text === "!deletebot") {
    const path = `./bots/${userId}`;
    if (!fs.existsSync(path)) return msg.channel.send("❌ No tenés bot.");
    fs.rmSync(path, { recursive: true, force: true });
    return msg.channel.send("🧹 Tu bot fue eliminado.");
  }

  // =====================
  // DEPLOY PRIVADO
  // =====================
  if (text === "!deploy") {
    if (msg.guild) return msg.reply("📩 Escribí `!deploy` por PRIVADO.");
    deploySessions[userId] = { step: 0, data: {} };
    return msg.channel.send("🧱 IP del servidor?");
  }

  if (deploySessions[userId]) {
    const s = deploySessions[userId];

    if (s.step === 0) {
      s.data.ip = text;
      s.step++;
      return msg.channel.send("🔌 Puerto?");
    }

    if (s.step === 1) {
      if (isNaN(text)) return msg.channel.send("❗ Puerto inválido.");
      s.data.port = text;
      s.step++;
      return msg.channel.send("🤖 Nombre del bot?");
    }

    if (s.step === 2) {
      s.data.name = text;
      s.step++;
      return msg.channel.send("🎮 Versión (ej 1.20.4)");
    }

    if (s.step === 3) {
      s.data.version = text;
      s.step++;
      return msg.channel.send("✅ Escribí `si` para confirmar.");
    }

    if (s.step === 4) {
      if (text.toLowerCase() !== "si") {
        delete deploySessions[userId];
        return msg.channel.send("❌ Cancelado.");
      }

      const folder = `./bots/${userId}`;
      if (!fs.existsSync("./bots")) fs.mkdirSync("./bots");
      if (!fs.existsSync(folder)) fs.mkdirSync(folder);

      const cfg = `
module.exports = {
  DISCORD_TOKEN: "${CFG.DISCORD_TOKEN}",
  SERVER_IP: "${s.data.ip}",
  SERVER_PORT: ${s.data.port},
  BOT_USERNAME: "${s.data.name}",
  MC_VERSION: "${s.data.version}",
  CHECK_INTERVAL: 30000,
  START_URL: "https://aternos.org/server/"
};
`;

      fs.writeFileSync(`${folder}/config.js`, cfg.trim());
      delete deploySessions[userId];

      return msg.channel.send(
        "✅ Config creada.\n\n" +
        "⚠ Reiniciá el bot:\n" +
        "`npm start`"
      );
    }

    return;
  }

  // =================
  // PANEL BOTONES
  // =================
  if (text === "!panel") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("start_bot").setLabel("🚀 Iniciar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("stop_bot").setLabel("🛑 Detener").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("status").setLabel("📡 Estado").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("help").setLabel("❓ Ayuda").setStyle(ButtonStyle.Secondary)
    );

    return msg.channel.send({ content: "🎮 PANEL PICOLAS BOT", components: [row] });
  }

  // =================
  // HELP
  // =================
  if (text === "!help") {
    return msg.channel.send(
      "🤖 PicolasAternosBot\n\n" +
      "`!status`\n`!start`\n`!start2`\n`!stop2`\n`!say`\n`!deploy`\n`!deletebot`\n`!panel`\n\n" +
      "👑 ADMIN:\n`!adminlist`\n`!admindelete ID`\n`!adminwipe`"
    );
  }

  // =================
  // STATUS
  // =================
  if (text === "!status") {
    const ok = await isOnline();
    return msg.channel.send(ok ? "🟢 ONLINE" : "🔴 OFFLINE");
  }

  // =================
  // LINK
  // =================
  if (text === "!start") {
    return msg.channel.send(CFG.START_URL || "https://aternos.org");
  }

  // =================
  // START BOT
  // =================
  if (text === "!start2") {
    if (mineProcess) return msg.channel.send("⚠ Ya activo.");
    mineProcess = spawn("node", ["minebot.js"], { stdio: "inherit" });
    mineProcess.on("exit", () => mineProcess = null);
    return msg.channel.send("✅ Minebot iniciado.");
  }

  // =================
  // STOP BOT
  // =================
  if (text === "!stop2") {
    if (!mineProcess) return msg.channel.send("ℹ No activo.");
    mineProcess.kill();
    mineProcess = null;
    return msg.channel.send("🛑 Detenido.");
  }

  // =================
  // SAY
  // =================
  if (text.startsWith("!say ")) {
    const m = text.slice(5).trim();
    if (!m) return msg.channel.send("❗ Texto vacío.");
    MineBot.tellFromDiscord(m);
    return msg.channel.send("✅ Enviado.");
  }
});

// =================
// BOTONES
// =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "start_bot") {
    if (mineProcess) return interaction.reply({ content: "⚠ Ya activo.", ephemeral: true });
    mineProcess = spawn("node", ["minebot.js"], { stdio: "inherit" });
    mineProcess.on("exit", () => mineProcess = null);
    return interaction.reply("✅ Bot iniciado.");
  }

  if (interaction.customId === "stop_bot") {
    if (!mineProcess) return interaction.reply({ content: "ℹ No activo.", ephemeral: true });
    mineProcess.kill();
    mineProcess = null;
    return interaction.reply("🛑 Bot detenido.");
  }

  if (interaction.customId === "status") {
    const ok = await isOnline();
    return interaction.reply(ok ? "🟢 ONLINE" : "🔴 OFFLINE");
  }

  if (interaction.customId === "help") {
    return interaction.reply({
      content: "`!panel` `!start` `!start2` `!stop2` `!say` `!deploy` `!deletebot`",
      ephemeral: true
    });
  }
});

// =================
// LOGIN
// =================
client.login(CFG.DISCORD_TOKEN);
