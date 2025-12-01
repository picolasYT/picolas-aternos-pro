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
  partials: [Partials.Channel, Partials.Message, Partials.User]
});

// ==========================
// SESIONES
// ==========================
let mineProcess = null;
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
// USUARIOS & PLANES
// ==========================
function getPlans() {
  return loadJSON(PLANS_FILE, {});
}
function getUsers() {
  return loadJSON(USERS_FILE, {});
}
function getUserData(userId) {
  const users = getUsers();
  if (!users[userId]) {
    users[userId] = { plan: "FREE", bots: 0, since: new Date().toISOString(), expire: null };
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
  const premium = loadJSON(PREMIUM_FILE, {});
  return premium[userId] === true;
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

  // actualizar contador SaaS
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
    s.on("connect", () => { s.destroy(); resolve(true); });
    s.on("timeout", () => { s.destroy(); resolve(false); });
    s.on("error", () => resolve(false));
    s.connect(CFG.SERVER_PORT || 25565, CFG.SERVER_IP);
  });
}

// ==========================
// READY
// ==========================
client.once("ready", () => {
  console.log("🤖 PicolasAternosBot SaaS listo:", client.user.username);
});

// ==========================
// MENSAJES
// ==========================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const text = (msg.content || "").trim();
  const userId = msg.author.id;

  // ==================================
  // ADMIN LOGIN
  // ==================================
  if (text.startsWith("!admin ")) {
    const pass = text.split(" ")[1];
    if (pass !== ADMIN_PASSWORD) return msg.reply("❌ Contraseña incorrecta.");

    adminSession[userId] = true;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("admin_list").setLabel("📋 Ver Bots").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("admin_wipe").setLabel("🔥 Borrar TODOS").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("admin_close").setLabel("❌ Cerrar").setStyle(ButtonStyle.Secondary)
    );

    return msg.channel.send({ content: "👑 PANEL ADMIN PICOLAS (SaaS)", components: [row] });
  }

  // ==================================
  // ADMIN PREMIUM
  // ==================================
  if (text.startsWith("!givepremium ")) {
    if (!adminSession[userId]) return msg.reply("⛔");

    const id = text.split(" ")[1];
    const premium = loadJSON(PREMIUM_FILE, {});
    premium[id] = true;
    saveJSON(PREMIUM_FILE, premium);

    const user = getUserData(id);
    user.plan = "PRO";
    updateUser(id, user);

    return msg.reply(`✅ Usuario ${id} ahora es **PRO**`);
  }

  if (text.startsWith("!removepremium ")) {
    if (!adminSession[userId]) return msg.reply("⛔");

    const id = text.split(" ")[1];
    const premium = loadJSON(PREMIUM_FILE, {});
    delete premium[id];
    saveJSON(PREMIUM_FILE, premium);

    const user = getUserData(id);
    user.plan = "FREE";
    updateUser(id, user);

    return msg.reply(`❌ Usuario ${id} volvió a **FREE**`);
  }

  // ==================================
  // PERFIL USUARIO
  // ==================================
  if (text === "!profile") {
    const u = getUserData(userId);
    return msg.reply(
      `👤 PERFIL\n` +
      `💳 Plan: ${u.plan}\n` +
      `🤖 Bots: ${u.bots}/${maxBotsFor(userId)}\n` +
      `📅 Desde: ${u.since}`
    );
  }

  // ==================================
  // PLANES
  // ==================================
  if (text === "!plans") {
    return msg.reply(
      "💎 **PLANES DISPONIBLES**\n\n" +
      "FREE: 1 bot\n" +
      "PRO: bots ilimitados + prioridad\n\n" +
      "🎟 Para PRO → hablá en nuestro Discord"
    );
  }

  // ==================================
  // BORRAR BOT PROPIO
  // ==================================
  if (text === "!deletebot") {
    const path = `./bots/${userId}`;
    if (!fs.existsSync(path)) return msg.channel.send("❌ No tenés bot.");
    fs.rmSync(path, { recursive: true, force: true });

    const user = getUserData(userId);
    if (user.bots > 0) user.bots--;
    updateUser(userId, user);

    return msg.channel.send("🧹 Tu bot fue eliminado.");
  }

  // ==================================
  // DEPLOY PRIVADO CON CONTROL SaaS
  // ==================================
  if (text === "!deploy") {
    if (msg.guild) return msg.reply("📩 Usá `!deploy` por DM.");
    
    const userData = getUserData(userId);
    if (userData.bots >= maxBotsFor(userId)) {
      return msg.reply("🚫 Límite de bots alcanzado. Pasate a **PRO**.");
    }

    deploySessions[userId] = { step: 0, data: {} };
    return msg.channel.send("🧱 IP del servidor?");
  }

  // >>> CONTINÚA DEPLOY
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
      return msg.channel.send("🎮 Versión de Minecraft?");
    }

    if (s.step === 3) {
      s.data.version = text;
      s.step++;
      return msg.channel.send("✅ Confirmar deploy? escribí: `si`");
    }

    if (s.step === 4) {
      if (text.toLowerCase() !== "si") {
        delete deploySessions[userId];
        return msg.channel.send("❌ Cancelado.");
      }

      const folder = `./bots/${userId}`;
      if (!fs.existsSync("./bots")) fs.mkdirSync("./bots");
      if (!fs.existsSync(folder)) fs.mkdirSync(folder);

// CONFIG SaaS
const user = getUserData(userId);
const plans = getPlans();
const plan = plans[user.plan] || plans["FREE"];

const cfg = `
module.exports = {
  SERVER_IP: "${s.data.ip}",
  SERVER_PORT: ${s.data.port},
  BOT_USERNAME: "${s.data.name}",
  MC_VERSION: "${s.data.version}",

  // SISTEMA SaaS
  PLAN: "${user.plan}",
  RECONNECT_TIME: ${plan.reconnect},
  ADS_ENABLED: ${plan.ads}
};
`;
fs.writeFileSync(`${folder}/config.js`, cfg.trim());

// copiar minebot
fs.copyFileSync("minebot.js", `${folder}/minebot.js`);

// index de ejecución
const index = `
const { spawn } = require("child_process");
function start() {
  const bot = spawn("node", ["minebot.js"], { stdio: "inherit" });
  bot.on("exit", () => setTimeout(start, 5000));
}
start();
`;
fs.writeFileSync(`${folder}/index.js`, index.trim());

// arrancar bot
spawn("node", ["index.js"], { cwd: folder, detached: true, stdio: "ignore" });

// actualizar SaaS
user.bots++;
updateUser(userId, user);

// limpiar sesión
delete deploySessions[userId];

return msg.channel.send(
  "✅ **BOT SaaS CREADO**\n" +
  `🤖 Nombre: ${s.data.name}\n` +
  `📂 Carpeta: ${folder}\n` +
  `💳 Plan: ${user.plan}`
);
    }
  }
  // ==================================
  // PANEL USUARIO
  // ==================================
  if (text === "!panel") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`start_${userId}`).setLabel("🚀 Iniciar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`stop_${userId}`).setLabel("🛑 Detener").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("status").setLabel("📡 Estado").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("help").setLabel("❓ Ayuda").setStyle(ButtonStyle.Secondary)
    );
    return msg.channel.send({ content: "🎮 PANEL USUARIO", components: [row] });
  }

  if (text === "!status") {
    const ok = await isOnline();
    return msg.channel.send(ok ? "🟢 ONLINE" : "🔴 OFFLINE");
  }

  if (text === "!start") {
    return msg.channel.send(CFG.START_URL || "https://aternos.org");
  }

  if (text.startsWith("!say ")) {
    const m = text.slice(5).trim();
    if (!m) return msg.reply("❗ Texto vacío.");
    MineBot.tellFromDiscord(m);
    return msg.channel.send("✅ Enviado.");
  }
});

// ==========================
// BOTONES
// ==========================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const userId = interaction.user.id;

  // ADMIN
  if (interaction.customId === "admin_list") {
    if (!adminSession[userId]) return interaction.reply({ content: "⛔", ephemeral: true });
    const bots = getBots();
    return interaction.reply(bots.length ? bots.join("\n") : "⚠ No hay bots");
  }

  if (interaction.customId === "admin_wipe") {
    if (!adminSession[userId]) return interaction.reply({ content: "⛔", ephemeral: true });
    getBots().forEach(id => deleteUserBot(id));
    return interaction.reply("🔥 Todos los bots eliminados.");
  }

  if (interaction.customId === "admin_close") {
    delete adminSession[userId];
    return interaction.reply("✅ Admin cerrado.");
  }

  // USER
  if (interaction.customId.startsWith("start_")) {
    const id = interaction.customId.split("_")[1];
    spawn("node", ["index.js"], { cwd: `./bots/${id}`, detached: true });
    return interaction.reply("✅ Bot iniciado.");
  }

  if (interaction.customId.startsWith("stop_")) {
    return interaction.reply("⚠ Stop aún no implementado.");
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
