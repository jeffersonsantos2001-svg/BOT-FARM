const config = require('../../config.json');
const { embedBase } = require('../utils/embeds');
const { progress, getLottery } = require('./goalService');
const { userStats } = require('./deliveryService');

async function goalsEmbed(client, period = 'weekly') {
  const labels = { weekly: 'Semanal', monthly: 'Mensal' };
  const { goal, rows } = await progress(period);
  const goalQty = Number(goal?.quantity || 0);
  const lines = [];
  for (const row of rows.slice(0, 15)) {
    const percent = goalQty ? Math.min(100, Math.floor((row.total / goalQty) * 100)) : 0;
    const missing = Math.max(0, goalQty - row.total);
    lines.push(`<@${row.author_id}> — **${Number(row.total).toLocaleString('pt-BR')}** / ${goalQty.toLocaleString('pt-BR')} (${percent}%) ${missing === 0 ? '✅' : `faltam ${missing.toLocaleString('pt-BR')}`}`);
  }
  const lottery = await getLottery();
  const embed = embedBase(config.colors.primary)
    .setTitle(`🎯 Metas ${labels[period]} FURIA`)
    .setDescription(lines.length ? lines.join('\n') : 'Nenhum progresso aprovado ainda.')
    .addFields({ name: 'Meta atual', value: `${goalQty.toLocaleString('pt-BR')} itens`, inline: true });

  if (lottery.prize) embed.addFields({ name: '🎁 Sorteio / premiação', value: lottery.prize.slice(0, 1024), inline: false });
  if (lottery.imageUrl && /^https?:\/\//i.test(lottery.imageUrl)) embed.setImage(lottery.imageUrl);
  return embed;
}

async function historyEmbed(userId) {
  const stats = await userStats(userId);
  const map = Object.fromEntries(stats.rows.map(r => [r.status, r]));
  const latest = stats.latest.map(d => `• \`${d.id}\` — ${d.type} — **${Number(d.quantity).toLocaleString('pt-BR')}** — ${statusLabel(d.status)}`).join('\n') || 'Sem entregas registradas.';
  return embedBase(config.colors.primary)
    .setTitle('📜 Meu Histórico FURIA')
    .setDescription(`<@${userId}>, aqui está seu resumo individual.`)
    .addFields(
      { name: '🟢 Aprovadas', value: `${map.approved?.count || 0} entrega(s)\n${Number(map.approved?.total || 0).toLocaleString('pt-BR')} itens`, inline: true },
      { name: '🔴 Recusadas', value: `${map.refused?.count || 0} entrega(s)\n${Number(map.refused?.total || 0).toLocaleString('pt-BR')} itens`, inline: true },
      { name: '🟡 Pendentes', value: `${map.pending?.count || 0} entrega(s)\n${Number(map.pending?.total || 0).toLocaleString('pt-BR')} itens`, inline: true },
      { name: 'Últimas entregas', value: latest, inline: false }
    );
}

function statusLabel(status) {
  return status === 'approved' ? '🟢 Aprovado' : status === 'refused' ? '🔴 Recusado' : '🟡 Pendente';
}

module.exports = { goalsEmbed, historyEmbed, statusLabel };
