const config = require('../../config.json');
const { getRequiredChannelId } = require('../utils/envConfig');
const { run, get } = require('../database/db');
const { mainPanelEmbed, mainPanelButtons, adminPanelEmbed, adminButtons } = require('../components/panels');
const { logAction } = require('./logService');

async function savePanel(name, channelId, messageId) {
  await run('INSERT OR REPLACE INTO panels(name, channel_id, message_id, updated_at) VALUES(?,?,?,?)', [name, channelId, messageId, Date.now()]);
}

async function clearRecentBotMessages(channel, limit = 20) {
  try {
    const messages = await channel.messages.fetch({ limit });
    const deletable = messages.filter(m => m.author?.bot && Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
    if (deletable.size) await channel.bulkDelete(deletable, true).catch(() => null);
  } catch {}
}

async function ensureMainPanel(client, force = false) {
  const channel = await client.channels.fetch(getRequiredChannelId('mainPanel')).catch(() => null);
  if (!channel?.isTextBased()) return;
  const saved = await get('SELECT * FROM panels WHERE name = ?', ['main']);
  if (!force && saved?.message_id) {
    const old = await channel.messages.fetch(saved.message_id).catch(() => null);
    if (old) return old;
  }
  await clearRecentBotMessages(channel);
  const msg = await channel.send({ embeds: [mainPanelEmbed()], components: mainPanelButtons() });
  await savePanel('main', channel.id, msg.id);
  await logAction(client, { title: '🔄 Painel principal recriado', description: `Painel enviado em <#${channel.id}>.` });
  return msg;
}

async function ensureAdminPanel(client, force = false) {
  const channel = await client.channels.fetch(getRequiredChannelId('admin')).catch(() => null);
  if (!channel?.isTextBased()) return;
  const saved = await get('SELECT * FROM panels WHERE name = ?', ['admin']);
  if (!force && saved?.message_id) {
    const old = await channel.messages.fetch(saved.message_id).catch(() => null);
    if (old) return old;
  }
  await clearRecentBotMessages(channel);
  const msg = await channel.send({ embeds: [adminPanelEmbed()], components: adminButtons() });
  await savePanel('admin', channel.id, msg.id);
  await logAction(client, { title: '⚙️ Painel admin recriado', description: `Painel enviado em <#${channel.id}>.` });
  return msg;
}

module.exports = { ensureMainPanel, ensureAdminPanel, clearRecentBotMessages };
