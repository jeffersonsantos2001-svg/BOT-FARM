const config = require('../../config.json');
const { getRequiredChannelId } = require('../utils/envConfig');
const { errorEmbed, successEmbed, warningEmbed, embedBase } = require('../utils/embeds');
const { hasAuthorizedRole, canApprove, mainAuthorizedRoleName } = require('../utils/permissions');
const { createSession, getSession, updateSession, clearSession } = require('../services/sessionService');
const { typeSelect, quantityModal, receiverSelect, confirmEmbed, confirmButtons, approvalEmbed, approvalButtons, refuseModal, goalModal, removeModal } = require('../components/panels');
const { createDelivery, setApprovalMessage, getDelivery, approveDelivery, refuseDelivery, removeDelivery, resetRanking, totals } = require('../services/deliveryService');
const { logAction } = require('../services/logService');
const { ensureMainPanel, clearRecentBotMessages } = require('../services/panelService');
const { rankingEmbed, updateRankingChannel } = require('../services/rankingService');
const { goalsEmbed, historyEmbed } = require('../services/viewService');
const { setGoal, setLottery } = require('../services/goalService');

async function safeReply(interaction, payload, autoDeleteMs = 15000) {
  try {
    const sent = (interaction.replied || interaction.deferred)
      ? await interaction.followUp(payload)
      : await interaction.reply(payload);

    if (payload?.ephemeral && autoDeleteMs > 0) {
      setTimeout(() => interaction.deleteReply().catch(() => null), autoDeleteMs);
    }
    return sent;
  } catch (err) {
    console.error('[SAFE_REPLY]', err);
  }
}

async function editAndAutoDelete(interaction, payload, autoDeleteMs = 3500) {
  try {
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
    await interaction.editReply(payload);
    if (autoDeleteMs > 0) setTimeout(() => interaction.deleteReply().catch(() => null), autoDeleteMs);
  } catch (err) {
    console.error('[EDIT_AUTO_DELETE]', err);
  }
}

async function hideInteractionMessage(interaction, payload) {
  const data = payload || { embeds: [embedBase().setTitle('✅ Selecionado').setDescription('Continue no formulário aberto.')], components: [] };
  try { if (interaction.message?.editable) return await interaction.message.edit(data); } catch (_) {}
  try { if (interaction.message?.id) return await interaction.webhook.editMessage(interaction.message.id, data); } catch (_) {}
}

async function handleInteraction(interaction) {
  try {
    if (!interaction.inGuild()) return safeReply(interaction, { embeds: [errorEmbed('Este sistema funciona apenas dentro do servidor.')], ephemeral: true });

    if (interaction.isButton()) return handleButton(interaction);
    if (interaction.isStringSelectMenu()) return handleSelect(interaction);
    if (interaction.isModalSubmit()) return handleModal(interaction);
  } catch (err) {
    console.error('[INTERACTION_ERROR]', err);
    await logAction(interaction.client, { title: '🚨 Erro de interação', description: String(err.stack || err), color: config.colors.error });
    return safeReply(interaction, { embeds: [errorEmbed('Ocorreu um erro interno. A equipe foi notificada.')], ephemeral: true });
  }
}

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id === 'farm:start') {
    createSession(interaction.user.id);
    return safeReply(interaction, {
      embeds: [embedBase().setTitle('📦 Nova entrega').setDescription('Selecione abaixo o tipo de farme entregue.')],
      components: typeSelect(),
      ephemeral: true
    }, 0);
  }

  if (id === 'farm:edit') {
    updateSession(interaction.user.id, { type: null, quantity: null, receiverId: null });
    return interaction.update({ embeds: [embedBase().setTitle('✏️ Editar entrega').setDescription('Selecione novamente o tipo de farme.')], components: typeSelect() });
  }

  if (id === 'farm:cancel') {
    clearSession(interaction.user.id);
    return editAndAutoDelete(interaction, { embeds: [warningEmbed('Entrega cancelada com segurança.')], components: [] }, 2500);
  }

  if (id === 'farm:confirm') return confirmDelivery(interaction);

  if (id === 'ranking:open') {
    return safeReply(interaction, { embeds: [await rankingEmbed(interaction.client, 'weekly'), await rankingEmbed(interaction.client, 'monthly'), await rankingEmbed(interaction.client, 'general')], ephemeral: true }, 30000);
  }

  if (id === 'goals:open') {
    return safeReply(interaction, { embeds: [await goalsEmbed(interaction.client, 'weekly'), await goalsEmbed(interaction.client, 'monthly')], ephemeral: true }, 30000);
  }

  if (id === 'history:open') {
    return safeReply(interaction, { embeds: [await historyEmbed(interaction.user.id)], ephemeral: true }, 30000);
  }

  if (id.startsWith('approve:')) return approveFlow(interaction, id.split(':')[1]);
  if (id.startsWith('refuse:')) return refuseFlow(interaction, id.split(':')[1]);
  if (id.startsWith('admin:')) return adminFlow(interaction, id);
}

async function handleSelect(interaction) {
  if (interaction.customId === 'farm:type') {
    const selected = interaction.values[0];
    const session = updateSession(interaction.user.id, { type: selected });
    await interaction.showModal(quantityModal());
    await hideInteractionMessage(interaction, {
      embeds: [embedBase().setTitle('✅ Tipo selecionado').setDescription(`Você selecionou: **${selected}**\n\nO menu foi fechado para evitar flood. Preencha a quantidade no formulário aberto.\n\nSessão: \`${session.id}\``)],
      components: []
    });
    return;
  }

  if (interaction.customId === 'farm:receiver') {
    await interaction.deferUpdate().catch(() => null);
    const receiverId = interaction.values[0];
    const s = updateSession(interaction.user.id, { receiverId });
    const member = await interaction.guild.members.fetch(receiverId).catch(() => null);
    if (!member) return editAndAutoDelete(interaction, { embeds: [errorEmbed('Recebedor inválido ou indisponível.')], components: [] }, 5000);
    return interaction.editReply({ embeds: [confirmEmbed(s, interaction.user, member.user)], components: confirmButtons() });
  }
}

async function handleModal(interaction) {
  if (interaction.customId === 'farm:quantity') return quantityFlow(interaction);
  if (interaction.customId.startsWith('refuseModal:')) return refuseModalFlow(interaction, interaction.customId.split(':')[1]);
  if (interaction.customId === 'admin:goalModal') return goalModalFlow(interaction);
  if (interaction.customId === 'admin:removeModal') return removeModalFlow(interaction);
}

async function quantityFlow(interaction) {
  const raw = interaction.fields.getTextInputValue('quantity').trim();
  if (!/^\d+$/.test(raw)) return safeReply(interaction, { embeds: [errorEmbed('A quantidade deve conter apenas números.')], ephemeral: true });
  const quantity = Number(raw);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return safeReply(interaction, { embeds: [errorEmbed('A quantidade deve ser maior que zero.')], ephemeral: true });
  if (quantity > config.limits.maxQuantity) return safeReply(interaction, { embeds: [errorEmbed(`Limite máximo permitido: **${config.limits.maxQuantity.toLocaleString('pt-BR')}**.`)], ephemeral: true });

  updateSession(interaction.user.id, { quantity });
  const members = await interaction.guild.members.fetch({ withPresences: true }).catch(() => null);
  if (!members) return safeReply(interaction, { embeds: [errorEmbed('Não consegui carregar os membros do servidor.')], ephemeral: true });

  const options = members
    .filter(m => !m.user.bot && m.presence?.status && ['online', 'idle', 'dnd'].includes(m.presence.status) && hasAuthorizedRole(m))
    .map(m => ({ label: `${m.displayName}`.slice(0, 90), description: mainAuthorizedRoleName(m).slice(0, 90), value: m.id, emoji: '📥' }))
    .slice(0, 25);

  if (!options.length) return safeReply(interaction, { embeds: [warningEmbed('Nenhum recebedor autorizado está online no momento.')], ephemeral: true });
  return safeReply(interaction, { embeds: [embedBase().setTitle('📥 Selecionar recebedor').setDescription('Escolha quem recebeu o farme.')], components: receiverSelect(options), ephemeral: true }, 0);
}

async function confirmDelivery(interaction) {
  await interaction.deferUpdate().catch(() => null);

  const s = getSession(interaction.user.id);
  if (!s?.type || !s.quantity || !s.receiverId) {
    return editAndAutoDelete(interaction, { embeds: [errorEmbed('Sessão inválida ou expirada. Comece novamente.')], components: [] }, 5000);
  }

  try {
    const delivery = await createDelivery({ type: s.type, quantity: s.quantity, authorId: interaction.user.id, receiverId: s.receiverId });
    const channel = await interaction.client.channels.fetch(getRequiredChannelId('approval')).catch(() => null);
    if (!channel?.isTextBased()) {
      return editAndAutoDelete(interaction, { embeds: [errorEmbed('Canal de aprovação inválido no config.json ou .env.')], components: [] }, 8000);
    }

    const msg = await channel.send({ embeds: [approvalEmbed(delivery)], components: approvalButtons(delivery.id) });
    await setApprovalMessage(delivery.id, msg.id);
    clearSession(interaction.user.id);

    await logAction(interaction.client, {
      title: '📦 Entrega criada',
      description: `Entrega \`${delivery.id}\` enviada para aprovação.`,
      fields: [
        { name: 'Autor', value: `<@${delivery.author_id}>`, inline: true },
        { name: 'Recebedor', value: `<@${delivery.receiver_id}>`, inline: true }
      ]
    });

    return editAndAutoDelete(interaction, { embeds: [successEmbed(`Entrega enviada para aprovação com ID \`${delivery.id}\`.`)], components: [] }, 3000);
  } catch (err) {
    console.error('[CONFIRM_DELIVERY]', err);
    return editAndAutoDelete(interaction, { embeds: [errorEmbed('Não consegui enviar a entrega. Verifique permissões e IDs dos canais.')], components: [] }, 8000);
  }
}

async function approveFlow(interaction, deliveryId) {
  await interaction.deferUpdate().catch(() => null);
  const delivery = await getDelivery(deliveryId);
  if (!delivery) return safeReply(interaction, { embeds: [errorEmbed('Entrega não encontrada.')], ephemeral: true });
  if (!canApprove(interaction.member, delivery.receiver_id)) {
    await logAction(interaction.client, { title: '⛔ Tentativa sem permissão', description: `<@${interaction.user.id}> tentou aprovar \`${deliveryId}\`.`, color: config.colors.error });
    return safeReply(interaction, { embeds: [errorEmbed('Você não tem permissão para aprovar esta entrega.')], ephemeral: true });
  }
  const updated = await approveDelivery(deliveryId, interaction.user.id);
  if (!updated) return safeReply(interaction, { embeds: [warningEmbed('Essa entrega já foi finalizada anteriormente.')], ephemeral: true });
  const embed = approvalEmbed(updated).setColor(config.colors.success).setTitle('🟢 Entrega aprovada').spliceFields(5, 1, { name: '📌 Status', value: '🟢 Aprovado', inline: true });
  await interaction.editReply({ embeds: [embed], components: approvalButtons(deliveryId, true) });
  const user = await interaction.client.users.fetch(updated.author_id).catch(() => null);
  await user?.send({ embeds: [successEmbed(`Sua entrega \`${deliveryId}\` foi aprovada.`)] }).catch(() => null);
  await updateRankingChannel(interaction.client).catch(() => null);
  await logAction(interaction.client, { title: '✅ Entrega aprovada', description: `Entrega \`${deliveryId}\` aprovada por <@${interaction.user.id}>.`, color: config.colors.success });
}

async function refuseFlow(interaction, deliveryId) {
  const delivery = await getDelivery(deliveryId);
  if (!delivery) return safeReply(interaction, { embeds: [errorEmbed('Entrega não encontrada.')], ephemeral: true });
  if (!canApprove(interaction.member, delivery.receiver_id)) return safeReply(interaction, { embeds: [errorEmbed('Você não tem permissão para recusar esta entrega.')], ephemeral: true });
  return interaction.showModal(refuseModal(deliveryId));
}

async function refuseModalFlow(interaction, deliveryId) {
  const reason = interaction.fields.getTextInputValue('reason').trim();
  if (!reason) return safeReply(interaction, { embeds: [errorEmbed('O motivo é obrigatório.')], ephemeral: true });
  const updated = await refuseDelivery(deliveryId, interaction.user.id, reason);
  if (!updated) return safeReply(interaction, { embeds: [warningEmbed('Essa entrega já foi finalizada anteriormente.')], ephemeral: true });
  const embed = approvalEmbed(updated).setColor(config.colors.error).setTitle('🔴 Entrega recusada').spliceFields(5, 1, { name: '📌 Status', value: '🔴 Recusado', inline: true }).addFields({ name: 'Motivo', value: reason });
  return safeReply(interaction, { embeds: [embed], ephemeral: true }, 10000);
}

async function adminFlow(interaction, id) {
  if (!hasAuthorizedRole(interaction.member)) return safeReply(interaction, { embeds: [errorEmbed('Acesso restrito à liderança/gerência.')], ephemeral: true });
  if (id === 'admin:repanel') {
    await ensureMainPanel(interaction.client, true);
    return safeReply(interaction, { embeds: [successEmbed('Painel principal reenviado sem duplicar.')], ephemeral: true });
  }
  if (id === 'admin:clear') {
    const channel = await interaction.client.channels.fetch(getRequiredChannelId('mainPanel')).catch(() => null);
    if (channel?.isTextBased()) await clearRecentBotMessages(channel, 100);
    await ensureMainPanel(interaction.client, true);
    return safeReply(interaction, { embeds: [successEmbed('Canal limpo e painel recriado.')], ephemeral: true });
  }
  if (id === 'admin:goal') return interaction.showModal(goalModal());
  if (id === 'admin:stats') {
    const t = await totals();
    return safeReply(interaction, { embeds: [embedBase().setTitle('📊 Estatísticas FURIA').addFields(
      { name: 'Entregas', value: String(t.deliveries || 0), inline: true },
      { name: 'Itens totais', value: Number(t.quantity || 0).toLocaleString('pt-BR'), inline: true },
      { name: 'Aprovadas', value: String(t.approved || 0), inline: true },
      { name: 'Recusadas', value: String(t.refused || 0), inline: true },
      { name: 'Pendentes', value: String(t.pending || 0), inline: true }
    )], ephemeral: true });
  }
  if (id === 'admin:remove') return interaction.showModal(removeModal());
  if (id === 'admin:reset') {
    const result = await resetRanking('all', interaction.user.id);
    await updateRankingChannel(interaction.client).catch(() => null);
    await logAction(interaction.client, {
      title: '♻️ Ranking resetado',
      description: `<@${interaction.user.id}> resetou o ranking semanal, mensal e geral. As entregas antigas continuam salvas no histórico, mas não contam mais no ranking.`,
      color: config.colors.warning
    });
    return safeReply(interaction, { embeds: [successEmbed(`Ranking resetado com sucesso. Novo início: <t:${Math.floor(result.at / 1000)}:f>.`)], ephemeral: true });
  }
}

async function goalModalFlow(interaction) {
  if (!hasAuthorizedRole(interaction.member)) return safeReply(interaction, { embeds: [errorEmbed('Sem permissão.')], ephemeral: true });
  const weekly = Number(interaction.fields.getTextInputValue('weekly').trim());
  const monthly = Number(interaction.fields.getTextInputValue('monthly').trim());
  const lottery = interaction.fields.getTextInputValue('lottery')?.trim() || '';
  const lotteryImage = interaction.fields.getTextInputValue('lotteryImage')?.trim() || '';

  if (!Number.isSafeInteger(weekly) || weekly <= 0 || !Number.isSafeInteger(monthly) || monthly <= 0) {
    return safeReply(interaction, { embeds: [errorEmbed('As metas devem ser números inteiros maiores que zero.')], ephemeral: true });
  }
  if (lotteryImage && !/^https?:\/\//i.test(lotteryImage)) {
    return safeReply(interaction, { embeds: [errorEmbed('A imagem do sorteio precisa ser um link direto começando com http:// ou https://.')], ephemeral: true });
  }

  await setGoal('weekly', weekly, interaction.user.id);
  await setGoal('monthly', monthly, interaction.user.id);
  await setLottery({ prize: lottery, imageUrl: lotteryImage });
  await logAction(interaction.client, { title: '🎯 Metas alteradas', description: `<@${interaction.user.id}> definiu semanal: ${weekly}, mensal: ${monthly}. Sorteio: ${lottery || 'não informado'}.` });
  return safeReply(interaction, { embeds: [successEmbed('Metas e sorteio atualizados com sucesso.')], ephemeral: true });
}

async function removeModalFlow(interaction) {
  if (!hasAuthorizedRole(interaction.member)) return safeReply(interaction, { embeds: [errorEmbed('Sem permissão.')], ephemeral: true });
  const deliveryId = interaction.fields.getTextInputValue('deliveryId').trim();
  const ok = await removeDelivery(deliveryId);
  if (!ok) return safeReply(interaction, { embeds: [errorEmbed('Entrega não encontrada.')], ephemeral: true });
  await updateRankingChannel(interaction.client).catch(() => null);
  await logAction(interaction.client, { title: '🗑️ Entrega removida', description: `<@${interaction.user.id}> removeu a entrega \`${deliveryId}\` e o ranking foi atualizado automaticamente.`, color: config.colors.error });
  return safeReply(interaction, { embeds: [successEmbed(`Entrega \`${deliveryId}\` removida e ranking atualizado.`)], ephemeral: true });
}

module.exports = { handleInteraction };
