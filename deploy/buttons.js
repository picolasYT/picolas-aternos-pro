const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function deployButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("deploy_start")
      .setLabel("✅ Crear bot")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("deploy_cancel")
      .setLabel("❌ Cancelar")
      .setStyle(ButtonStyle.Danger)
  );
}

module.exports = { deployButtons };
