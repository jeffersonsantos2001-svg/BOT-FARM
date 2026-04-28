const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

function embedBase(color = config.colors.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: config.bot.footer })
    .setTimestamp();
}

function errorEmbed(text) {
  return embedBase(config.colors.error).setTitle('❌ Ação bloqueada').setDescription(text);
}

function successEmbed(text) {
  return embedBase(config.colors.success).setTitle('✅ Sucesso').setDescription(text);
}

function warningEmbed(text) {
  return embedBase(config.colors.warning).setTitle('⚠️ Atenção').setDescription(text);
}

module.exports = { embedBase, errorEmbed, successEmbed, warningEmbed };
