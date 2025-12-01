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

// ==========================
// CLIENTE DISCORD
// ==========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// ==========================
// SESIONES
// ==========================
const deploySessions = {};
const adminSession = {};
const ADMIN_PASSWORD = "picolas1234";

// ==========================
// SISTEMA SaaS
// ==========================
const USERS_FILE = "./data/users.json";
const PREMIUM_FILE = "./data/premium.json";
const PLANS_FILE = "./data/plans.json";

// ==========================
// HELPERS JSON
// ==========================
function loadJSON(file, def = {}) {
  if (!fs.existsSync(file)) return def;
  return JSON.parse(fs.readFileSync(file));
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ==========================
// SANITIZADOR ANTI DUPLICADOS
// ==========================
function sanitizeUser(userId) {
  const users = loadJSON(USERS_FILE, {});
  const id = String(userId);

  const fixed = {};

  Object.entries(users).forEach(([key, val]) => {
    const k = String(key);
    fixed[k] = val;
  });

  saveJSON(USERS_FILE, fixed);
}

// ==========================
// USUARIOS & PLANES
// ==========================
function getPlans() {
  return loadJSON(PLANS_FILE, {});
}
function getUsers() {
  return loadJSON(USERS_FILE, {});
}
function getUserData(userId) {
  sanitizeUser(userId);
  const users = getUsers();

  if (!users[userId]) {
    users[userId] = {
      plan: "FREE",
      bots: 0,
      since: new Date().toISOString(),
      expire: null
    };
    saveJSON(USERS_FILE, users);
  }
  return users[userId];
}
function updateUser(userId, data) {
  const users = getUsers();
  users[userId] = data;
  saveJSON(USERS_FILE, users);
}
function maxBotsFor(userId) {
  const plans = getPlans();
  const user = getUserData(userId);
  const plan = plans[user.plan] || plans["FREE"];
  return plan.maxBots || 1;
}
function isPremium(userId) {
  const user = getUserData(userId);
  return user.plan === "PRO";
}

// ==========================
// ADMIN
// ==========================
function isAdmin(id) {
  return adminSession[id] === true;
}
function getBots() {
  if (!fs.existsSync("./bots")) return [];
  return fs.readdirSync("./bots").filter(f => fs.lstatSync(`./bots/${f}`).isDirectory());
}
function deleteUserBot(userId) {
  const path = `./bots/${userId}`;
  if (!fs.existsSync(path)) return false;
  fs.rmSync(path, { recursive: true, force: true });

  const user = getUserData(userId);
  if (user.bots > 0) {
    user.bots--;
    updateUser(userId, user);
  }

  return true;
}

// ==========================
// CHECK MC SERVER
// ==========================
function isOnline() {
  return new Promise(resolve => {
    const s = new net.Socket();
    s.setTimeout(3000);
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("timeout", () => { s.destroy(); resolve(false); });
    s.once("error", () => resolve(false));
    s.connect(CFG.SERVER_PORT || 25565, CFG.SERVER_IP);
  });
}

// ==========================
// READY
// ==========================
client.once("ready", () => {
  console.log("🤖 PicolasAternosBot SaaS LISTO COMO", client.user.username);
});

// ==========================
// MENSAJES
// ==========================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const text = msg.content.trim();
  const userId = msg.author.id;

  // LOG REAL
  console.log(`💬 ${msg.author.username}: ${text}`);

  // ==========================
  // HELP
  // ==========================
  if (text === "!help") {
    return msg.reply(
      "🤖 **PicolasAternosBot SaaS**\n\n" +
      "`!deploy` → Crear tu bot\n" +
      "`!profile` → Ver tu plan\n" +
      "`!plans` → Ver planes\n" +
      "`!panel` → Panel interactivo\n" +
      "`!deletebot` → Borrar tu bot\n" +
      "`!say` → Hablar en tu server\n\n" +
      "👑 ADMIN:\n" +
      "`!admin CONTRASEÑA`\n" +
      "`!givepremium ID`\n" +
      "`!removepremium ID`"
    );
  }

  // ==========================
  // ADMIN LOGIN
  // ==========================
  if (text.startsWith("!admin ")) {
    const pass = text.split(" ")[1];
    if (pass !== ADMIN_PASSWORD) return msg.reply("❌ Incorrecta.");

    adminSession[userId] = true;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("admin_list").setLabel("📋 Bots").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("admin_wipe").setLabel("🔥 WIPE").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("admin_close").setLabel("❌ Cerrar").setStyle(ButtonStyle.Secondary)
    );

    return msg.channel.send({ content: "👑 PANEL ADMIN", components: [row] });
  }

  // ==========================
  // GIVE PREMIUM
  // ==========================
  if (text.startsWith("!givepremium ")) {
    if (!isAdmin(userId)) return msg.reply("⛔");

    const id = text.split(" ")[1];
    if (!id) return msg.reply("❗ ID faltante.");

    sanitizeUser(id);

    const user = getUserData(id);
    user.plan = "PRO";
    updateUser(id, user);

    return msg.reply(`✅ Usuario ${id} ahora es **PRO**`);
  }

  // ==========================
  // REMOVE PREMIUM
  // ==========================
  if (text.startsWith("!removepremium ")) {
    if (!isAdmin(userId)) return msg.reply("⛔");

    const id = text.split(" ")[1];
    if (!id) return msg.reply("❗ ID faltante.");

    sanitizeUser(id);

    const user = getUserData(id);
    user.plan = "FREE";
    updateUser(id, user);

    return msg.reply(`❌ Usuario ${id} volvió a **FREE**`);
  }

  // ==========================
  // PERFIL
  // ==========================
  if (text === "!profile") {
    const u = getUserData(userId);
    return msg.reply(
      `👤 PERFIL\n` +
      `💳 Plan: ${u.plan}\n` +
      `🤖 Bots: ${u.bots}/${maxBotsFor(userId)}\n` +
      `📅 Desde: ${u.since}`
    );
  }

  // ==========================
  // PLANES
  // ==========================
  if (text === "!plans") {
    return msg.reply(
      "💎 PLANES\n\nFREE → 1 bot\nPRO → ilimitados\n\nHablanos en Discord para PRO"
    );
  }

  // ==========================
  // DELETE BOT
  // ==========================
  if (text === "!deletebot") {
    const ok = deleteUserBot(userId);
    return msg.reply(ok ? "🗑 Bot eliminado." : "❌ No tenés bot.");
  }

  // ==========================
  // DEPLOY
  // ==========================
  if (text === "!deploy") {
    if (msg.guild) return msg.reply("📩 Usá por DM.");

    const u = getUserData(userId);
    if (u.bots >= maxBotsFor(userId)) {
      return msg.reply("🚫 Límite alcanzado. Pasate a PRO.");
    }

    deploySessions[userId] = { step: 0, data: {} };
    return msg.reply("🧱 IP?");
  }

  // ==========================
  // DEPLOY FLOW
  // ==========================
  if (deploySessions[userId]) {
    const s = deploySessions[userId];

    if (s.step === 0) {
      s.data.ip = text;
      s.step++;
      return msg.reply("🔌 Puerto?");
    }
    if (s.step === 1) {
      if (isNaN(text)) return msg.reply("❗ Número inválido.");
      s.data.port = text;
      s.step++;
      return msg.reply("🤖 Nombre?");
    }
    if (s.step === 2) {
      s.data.name = text;
      s.step++;
      return msg.reply("🎮 Versión?");
    }
    if (s.step === 3) {
      s.data.version = text;
      s.step++;
      return msg.reply("Confirmar? escribí `si`");
    }

    if (s.step === 4) {
      if (text.toLowerCase() !== "si") {
        delete deploySessions[userId];
        return msg.reply("❌ Cancelado.");
      }

      const folder = `./bots/${userId}`;
      if (!fs.existsSync("./bots")) fs.mkdirSync("./bots");
      if (!fs.existsSync(folder)) fs.mkdirSync(folder);

      const user = getUserData(userId);
      const plans = getPlans();
      const plan = plans[user.plan] || plans["FREE"];

      const cfg = `
module.exports = {
  SERVER_IP: "${s.data.ip}",
  SERVER_PORT: ${s.data.port},
  BOT_USERNAME: "${s.data.name}",
  MC_VERSION: "${s.data.version}",
  PLAN: "${user.plan}",
  RECONNECT_TIME: ${plan.reconnect},
  ADS_ENABLED: ${plan.ads}
};
`;
      fs.writeFileSync(`${folder}/config.js`, cfg.trim());
      fs.copyFileSync("minebot.js", `${folder}/minebot.js`);

      const index = `
const { spawn } = require("child_process");
function start() {
  const bot = spawn("node", ["minebot.js"], { stdio: "inherit" });
  bot.on("exit", () => setTimeout(start, 5000));
}
start();
`;
      fs.writeFileSync(`${folder}/index.js`, index.trim());

      spawn("node", ["index.js"], { cwd: folder, stdio: "inherit" });

      user.bots++;
      updateUser(userId, user);
      delete deploySessions[userId];

      return msg.reply(`✅ BOT CREADO COMO **${user.plan}**`);
    }
  }

  // ==========================
  // PANEL
  // ==========================
  if (text === "!panel") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`start_${userId}`).setLabel("🚀 Iniciar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("status").setLabel("📡 Estado").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("help").setLabel("❓ Ayuda").setStyle(ButtonStyle.Secondary),
    );
    return msg.reply({ content: "🎮 PANEL", components: [row] });
  }

  if (text === "!status") {
    const ok = await isOnline();
    return msg.reply(ok ? "🟢 ONLINE" : "🔴 OFFLINE");
  }

  if (text.startsWith("!say ")) {
    MineBot.tellFromDiscord(text.slice(5));
    return msg.reply("✅ Enviado.");
  }
});

// ==========================
// BOTONES
// ==========================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const userId = interaction.user.id;

  if (interaction.customId === "admin_list") {
    const bots = getBots();
    return interaction.reply(bots.join("\n") || "Vacío");
  }

  if (interaction.customId === "admin_wipe") {
    getBots().forEach(b => deleteUserBot(b));
    return interaction.reply("🔥 LIMPIADO");
  }

  if (interaction.customId === "admin_close") {
    delete adminSession[userId];
    return interaction.reply("✅ Cerrado.");
  }

  if (interaction.customId.startsWith("start_")) {
    spawn("node", ["index.js"], { cwd: `./bots/${userId}`, stdio: "inherit" });
    return interaction.reply("🚀 Iniciado.");
  }

  if (interaction.customId === "status") {
    const ok = await isOnline();
    return interaction.reply(ok ? "🟢 ONLINE" : "🔴 OFFLINE");
  }

  if (interaction.customId === "help") {
    return interaction.reply({ content: "`!deploy` `!profile` `!plans`", ephemeral: true });
  }
});

// ==========================
// LOGIN
// ==========================
client.login(CFG.DISCORD_TOKEN);
