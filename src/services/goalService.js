const { run, get, all } = require('../database/db');
const { effectiveRange } = require('./deliveryService');

async function setGoal(period, quantity, by) {
  await run('INSERT OR REPLACE INTO goals(period, quantity, updated_at, updated_by) VALUES(?,?,?,?)', [period, quantity, Date.now(), by]);
}

async function getGoal(period) {
  return await get('SELECT * FROM goals WHERE period = ?', [period]);
}

async function setSetting(key, value) {
  await run('INSERT OR REPLACE INTO settings(key, value) VALUES(?,?)', [key, String(value || '')]);
}

async function getSetting(key) {
  const row = await get('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value || '';
}

async function setLottery({ prize, imageUrl }) {
  await setSetting('lottery_prize', prize || '');
  await setSetting('lottery_image', imageUrl || '');
}

async function getLottery() {
  return {
    prize: await getSetting('lottery_prize'),
    imageUrl: await getSetting('lottery_image')
  };
}

async function progress(period) {
  const goal = await getGoal(period);
  const start = await effectiveRange(period);
  const rows = await all(`SELECT author_id, COALESCE(SUM(quantity),0) total FROM deliveries
    WHERE status='approved' AND created_at >= ? GROUP BY author_id ORDER BY total DESC`, [start]);
  return { goal, rows };
}

module.exports = { setGoal, getGoal, setLottery, getLottery, progress };
