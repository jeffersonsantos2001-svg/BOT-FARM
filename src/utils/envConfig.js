const config = require('../../config.json');

function envOrConfig(envKey, fallback) {
  const value = process.env[envKey];
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function getChannelId(name) {
  const map = {
    mainPanel: 'CHANNEL_MAIN_PANEL_ID',
    goals: 'CHANNEL_GOALS_ID',
    approval: 'CHANNEL_APPROVAL_ID',
    logs: 'CHANNEL_LOGS_ID',
    ranking: 'CHANNEL_RANKING_ID',
    admin: 'CHANNEL_ADMIN_ID'
  };
  return envOrConfig(map[name], config.channels?.[name]);
}

function getRequiredChannelId(name) {
  const id = getChannelId(name);
  if (!id || !/^\d{15,25}$/.test(id)) {
    console.warn(`[CONFIG] Canal ${name} não configurado. Preencha ${name} no .env.`);
    return null;
  }
  return id;
}

module.exports = { getChannelId, getRequiredChannelId };
