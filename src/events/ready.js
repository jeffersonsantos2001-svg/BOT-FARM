const cron = require('node-cron');
const config = require('../../config.json');
const { ensureMainPanel, ensureAdminPanel } = require('../services/panelService');
const { updateRankingChannel } = require('../services/rankingService');

module.exports = async function ready(client) {
  console.log(`[READY] ${client.user.tag} online.`);
  await ensureMainPanel(client).catch(err => console.error('[MAIN_PANEL]', err));
  await ensureAdminPanel(client).catch(err => console.error('[ADMIN_PANEL]', err));
  await updateRankingChannel(client).catch(err => console.error('[RANKING_UPDATE]', err));

  cron.schedule(config.ranking.autoUpdateCron, () => {
    updateRankingChannel(client).catch(err => console.error('[CRON_RANKING]', err));
  }, { timezone: config.bot.timezone });
};
