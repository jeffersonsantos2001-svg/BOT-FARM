const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { embedBase } = require('../utils/embeds');
const config = require('../../config.json');

const TYPES = ['Pólvora', 'Projétil de Fuzil', 'Projétil de Pistola', 'Projétil de Submetralhadora', 'Dinheiro Sujo', 'Outros'];

function mainPanelEmbed() {
  return embedBase(config.colors.primary)
    .setTitle('📦 Sistema de Farmes FURIA')
    .setDescription('Controle de farmes Furia, entregas, aprovação, metas e ranking da facção **FURIA**.\n\nUse os botões abaixo para registrar entregas, consultar metas, ver ranking ou acessar seu histórico.')
    .addFields(
      { name: '🚚 Entrega segura', value: 'Fluxo com confirmação, validações e aprovação.', inline: true },
      { name: '🏆 Ranking', value: 'Semanal, mensal e geral automaticamente.', inline: true },
      { name: '🎯 Metas', value: 'Acompanhe seu progresso em tempo real.', inline: true }
    );
}

function mainPanelButtons() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('farm:start').setLabel('Entregar Farme').setEmoji('📦').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ranking:open').setLabel('Ranking').setEmoji('📊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('goals:open').setLabel('Metas').setEmoji('🎯').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('history:open').setLabel('Meu Histórico').setEmoji('📜').setStyle(ButtonStyle.Secondary)
  )];
}

function typeSelect() {
  return [new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('farm:type')
      .setPlaceholder('Selecione o tipo de farme entregue')
      .addOptions(TYPES.map(t => ({ label: t, value: t, emoji: t === 'Dinheiro Sujo' ? '💰' : '📦' })))
  )];
}

function quantityModal() {
  return new ModalBuilder().setCustomId('farm:quantity').setTitle('Quantidade entregue').addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('quantity').setLabel('Digite a quantidade').setPlaceholder('Exemplo: 5000').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(12)
    )
  );
}

function receiverSelect(options) {
  return [new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('farm:receiver')
      .setPlaceholder('Selecione quem recebeu o farme')
      .addOptions(options.slice(0, 25))
  )];
}

function confirmEmbed(session, user, receiver) {
  return embedBase(config.colors.warning).setTitle('✅ Confirmação da Entrega').setDescription('Confira todos os dados antes de enviar para aprovação.').addFields(
    { name: '📦 Tipo', value: String(session.type), inline: true },
    { name: '🔢 Quantidade', value: Number(session.quantity).toLocaleString('pt-BR'), inline: true },
    { name: '👤 Entregador', value: `<@${user.id}>`, inline: true },
    { name: '📥 Recebedor', value: `<@${receiver.id}>`, inline: true },
    { name: '🆔 Sessão', value: `\`${session.id}\``, inline: false }
  );
}

function confirmButtons() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('farm:confirm').setLabel('Confirmar').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('farm:edit').setLabel('Editar').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('farm:cancel').setLabel('Cancelar').setEmoji('❌').setStyle(ButtonStyle.Danger)
  )];
}

function approvalEmbed(delivery) {
  return embedBase(config.colors.warning).setTitle('🟡 Entrega aguardando aprovação').addFields(
    { name: '🆔 ID', value: `\`${delivery.id}\``, inline: false },
    { name: '👤 Entregador', value: `<@${delivery.author_id}>`, inline: true },
    { name: '📥 Recebedor', value: `<@${delivery.receiver_id}>`, inline: true },
    { name: '📦 Tipo', value: delivery.type, inline: true },
    { name: '🔢 Quantidade', value: Number(delivery.quantity).toLocaleString('pt-BR'), inline: true },
    { name: '📌 Status', value: '🟡 Aguardando aprovação', inline: true }
  );
}

function approvalButtons(id, disabled = false) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`approve:${id}`).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`refuse:${id}`).setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger).setDisabled(disabled)
  )];
}

function refuseModal(id) {
  return new ModalBuilder().setCustomId(`refuseModal:${id}`).setTitle('Motivo da recusa').addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel('Explique o motivo').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    )
  );
}

function adminPanelEmbed() {
  return embedBase(config.colors.primary).setTitle('⚙️ Painel Administrativo FURIA').setDescription('Área restrita para gerenciar painéis, metas, ranking, estatísticas e entregas.');
}

function adminButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin:repanel').setLabel('Reenviar Painel').setEmoji('🔄').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('admin:clear').setLabel('Limpar Canal').setEmoji('🧹').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('admin:goal').setLabel('Definir Meta').setEmoji('🎯').setStyle(ButtonStyle.Success)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin:reset').setLabel('Reset Ranking').setEmoji('♻️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('admin:stats').setLabel('Estatísticas').setEmoji('📊').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('admin:remove').setLabel('Remover Entrega').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    )
  ];
}

function goalModal() {
  return new ModalBuilder().setCustomId('admin:goalModal').setTitle('Definir metas e sorteio').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('weekly').setLabel('Meta semanal').setPlaceholder('Exemplo: 10000').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('monthly').setLabel('Meta mensal').setPlaceholder('Exemplo: 40000').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('lottery').setLabel('Sorteio / premiação').setPlaceholder('Exemplo: R$ 50 + item especial').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(120)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('lotteryImage').setLabel('URL da imagem do sorteio').setPlaceholder('Ex: https://i.imgur.com/imagem.png').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(300))
  );
}

function removeModal() {
  return new ModalBuilder().setCustomId('admin:removeModal').setTitle('Remover entrega').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('deliveryId').setLabel('ID da entrega').setStyle(TextInputStyle.Short).setRequired(true))
  );
}

module.exports = { mainPanelEmbed, mainPanelButtons, typeSelect, quantityModal, receiverSelect, confirmEmbed, confirmButtons, approvalEmbed, approvalButtons, refuseModal, adminPanelEmbed, adminButtons, goalModal, removeModal };
