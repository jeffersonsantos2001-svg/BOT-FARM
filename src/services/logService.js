const config = require('../../config.json');
const { getRequiredChannelId } = require('../utils/envConfig');
const { embedBase } = require('../utils/embeds');

async function logAction(client, { title, description, fields = [], color = config.colors.primary }) {
  try {
    const channel = await client.channels.fetch(getRequiredChannelId('logs')).catch(() => null);
    if (!channel?.isTextBased()) return;
    const embed = embedBase(color).setTitle(title).setDescription(description || 'Registro do sistema.');
    if (fields.length) embed.addFields(fields);
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[LOG_SERVICE]', err);
  }
}

module.exports = { logAction };
