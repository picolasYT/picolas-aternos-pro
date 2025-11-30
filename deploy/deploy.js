const { deployButtons } = require("./buttons");
const { startSession, setAnswer, getSession, endSession } = require("./flow");

function initDeploy(client) {

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const user = interaction.user;

    if (interaction.customId === "deploy_start") {
      startSession(user.id);
      await interaction.update({ 
        content: "📡 **Paso 1/4**\n\nEscribí la IP del servidor:",
        components: []
      });
    }

    if (interaction.customId === "deploy_cancel") {
      endSession(user.id);
      return interaction.update({ content: "❌ Deploy cancelado.", components: [] });
    }
  });

  client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    const session = getSession(msg.author.id);
    if (!session) return;

    if (session.step === 1) {
      setAnswer(msg.author.id, "SERVER_IP", msg.content);
      return msg.channel.send("✅ IP guardada.\n📍 Paso 2/4: Puerto del servidor");
    }

    if (session.step === 2) {
      setAnswer(msg.author.id, "SERVER_PORT", msg.content);
      return msg.channel.send("✅ Puerto guardado.\n🤖 Paso 3/4: Username del bot");
    }

    if (session.step === 3) {
      setAnswer(msg.author.id, "BOT_USERNAME", msg.content);
      return msg.channel.send("✅ Username guardado.\n🧩 Paso 4/4: Versión Minecraft");
    }

    if (session.step === 4) {
      setAnswer(msg.author.id, "VERSION", msg.content);

      const final = getSession(msg.author.id);

      await msg.channel.send(
        "🎉 **DEPLOY COMPLETADO**\n\n" +
        "```json\n" + JSON.stringify(final.config, null, 2) + "\n```"
      );

      endSession(msg.author.id);
    }
  });
}

module.exports = { initDeploy };
