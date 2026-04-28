const { get } = require('../database/db');
const { ensureMainPanel, ensureAdminPanel } = require('../services/panelService');

module.exports = async function messageDelete(message) {
  try {
    if (!message.guild || !message.id) return;
    const main = await get('SELECT * FROM panels WHERE name = ?', ['main']);
    if (main?.message_id === message.id) return ensureMainPanel(message.client, true);
    const admin = await get('SELECT * FROM panels WHERE name = ?', ['admin']);
    if (admin?.message_id === message.id) return ensureAdminPanel(message.client, true);
  } catch (err) {
    console.error('[MESSAGE_DELETE]', err);
  }
};
