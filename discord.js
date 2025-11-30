const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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
  ]
});

let mineProcess = null;
const deploySessions = {};

// =================
// PING SERVER
// =================
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
  if (msg.author.bot) return;
  const text = msg.content.trim();
  const userId = msg.author.id;

  console.log(`📩 ${msg.author.username}: ${text}`);

  // =================
  // DEPLOY PRIVADO
  // =================
  if (text === "!deploy") {
    if (msg.guild) return msg.reply("📩 Mandá `!deploy` por PRIVADO.");

    deploySessions[userId] = { step: 0, data: {} };
    return msg.channel.send("🧱 IP del servidor?");
  }

  if (deploySessions[userId]) {
    const s = deploySessions[userId];

    if (s.step === 0) {
      s.data.ip = text;
      s.step++;
      return msg.channel.send("🔌 Puerto del servidor?");
    }

    if (s.step === 1) {
      if (isNaN(text)) return msg.channel.send("❗ El puerto debe ser número.");
      s.data.port = text;
      s.step++;
      return msg.channel.send("🤖 Nombre del bot?");
    }

    if (s.step === 2) {
      s.data.name = text;
      s.step++;
      return msg.channel.send("🎮 Versión del server? (ej: 1.20.4)");
    }

    if (s.step === 3) {
      s.data.version = text;
      s.step++;
      return msg.channel.send("✅ Escribí `si` para confirmar o `no`");
    }

    if (s.step === 4) {
      if (text.toLowerCase() !== "si") {
        delete deploySessions[userId];
        return msg.channel.send("❌ Deploy cancelado.");
      }

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

      fs.writeFileSync("./config.js", cfg.trim());
      delete deploySessions[userId];

      return msg.channel.send(
        "✅ CONFIG creada.\n" +
        "♻ Reiniciá el bot:\n" +
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
      new ButtonBuilder()
        .setCustomId("start_bot")
        .setLabel("🚀 Iniciar Minebot")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("stop_bot")
        .setLabel("🛑 Detener Minebot")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("status")
        .setLabel("📡 Estado")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("help")
        .setLabel("❓ Ayuda")
        .setStyle(ButtonStyle.Secondary)
    );

    return msg.channel.send({
      content: "🎮 **PANEL PICOLAS BOT**",
      components: [row]
    });
  }

  // =================
  // HELP
  // =================
  if (text === "!help") {
    return msg.channel.send(
      "🤖 **PicolasAternosBot**\n\n" +
      "🟢 `!status`\n" +
      "🚀 `!start`\n\n" +
      "🎮 **Minebot**\n" +
      "▶ `!start2`\n" +
      "⏹ `!stop2`\n" +
      "📢 `!say mensaje`\n\n" +
      "🎛 `!panel`\n" +
      "📩 `!deploy` (por privado)"
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
  // START MINEBOT
  // =================
  if (text === "!start2") {
    const ok = await isOnline();
    if (!ok) return msg.channel.send("🔴 Servidor apagado.");

    if (mineProcess) return msg.channel.send("⚠️ Ya está activo.");

    mineProcess = spawn("node", ["minebot.js"], { stdio: "inherit" });
    mineProcess.on("exit", () => mineProcess = null);

    return msg.channel.send("✅ Minebot iniciado.");
  }

  // =================
  // STOP MINEBOT
  // =================
  if (text === "!stop2") {
    if (!mineProcess) return msg.channel.send("ℹ️ No está activo.");

    mineProcess.kill();
    if (MineBot.stopBot) MineBot.stopBot();
    mineProcess = null;

    return msg.channel.send("🛑 Minetbot detenido.");
  }

  // =================
  // SAY
  // =================
  if (text.startsWith("!say ")) {
    const m = text.slice(5).trim();
    if (!m) return msg.channel.send("❗ Falta texto.");
    MineBot.tellFromDiscord(m);
    return msg.channel.send("✅ Enviado al server.");
  }
});

// =================
// BOTONES
// =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "start_bot") {
    const ok = await isOnline();
    if (!ok) return interaction.reply({ content: "🔴 Servidor apagado.", ephemeral: true });

    if (mineProcess) return interaction.reply({ content: "⚠ Ya está activo.", ephemeral: true });

    mineProcess = spawn("node", ["minebot.js"], { stdio: "inherit" });
    mineProcess.on("exit", () => mineProcess = null);

    return interaction.reply("✅ Minebot conectado.");
  }

  if (interaction.customId === "stop_bot") {
    if (!mineProcess) return interaction.reply({ content: "ℹ No está activo.", ephemeral: true });

    mineProcess.kill();
    if (MineBot.stopBot) MineBot.stopBot();
    mineProcess = null;

    return interaction.reply("🛑 Bot detenido.");
  }

  if (interaction.customId === "status") {
    const ok = await isOnline();
    return interaction.reply(ok ? "🟢 ONLINE" : "🔴 OFFLINE");
  }

  if (interaction.customId === "help") {
    return interaction.reply({
      content:
        "🤖 **Comandos**\n\n" +
        "`!panel`\n" +
        "`!status`\n" +
        "`!start`\n" +
        "`!start2`\n" +
        "`!stop2`\n" +
        "`!say`\n" +
        "`!deploy`",
      ephemeral: true
    });
  }
});

// =================
// LOGIN
// =================
client.login(CFG.DISCORD_TOKEN);
