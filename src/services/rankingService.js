const config = require('../../config.json');
const { getRequiredChannelId } = require('../utils/envConfig');
const { embedBase } = require('../utils/embeds');
const { ranking } = require('./deliveryService');

async function rankingEmbed(client, period = 'weekly') {
  const labels = { weekly: 'Semanal', monthly: 'Mensal', general: 'Geral' };
  const rows = await ranking(period, config.limits.rankingTopLimit);
  const lines = [];
  for (let i = 0; i < rows.length; i++) {
    const user = await client.users.fetch(rows[i].author_id).catch(() => null);
    lines.push(`**${i + 1}.** ${user ? user.toString() : `<@${rows[i].author_id}>`} — **${Number(rows[i].total).toLocaleString('pt-BR')}** itens`);
  }
  return embedBase(config.colors.primary)
    .setTitle(`🏆 Ranking ${labels[period] || 'Geral'} FURIA`)
    .setDescription(lines.length ? lines.join('\n') : 'Nenhuma entrega aprovada ainda.')
    .addFields({ name: '📌 Regra', value: 'Somente entregas aprovadas entram no ranking.' });
}

async function updateRankingChannel(client) {
  const channel = await client.channels.fetch(getRequiredChannelId('ranking')).catch(() => null);
  if (!channel?.isTextBased()) return;
  const embeds = [await rankingEmbed(client, 'weekly'), await rankingEmbed(client, 'monthly'), await rankingEmbed(client, 'general')];
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const botMessages = messages?.filter(m => m.author?.id === client.user.id);
  if (botMessages?.size) await channel.bulkDelete(botMessages, true).catch(() => null);
  await channel.send({ embeds });
}

module.exports = { rankingEmbed, updateRankingChannel };
