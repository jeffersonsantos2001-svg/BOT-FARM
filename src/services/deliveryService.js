const { run, get, all } = require('../database/db');
const { makeDeliveryId } = require('../utils/ids');

async function createDelivery({ type, quantity, authorId, receiverId }) {
  const id = makeDeliveryId();
  const now = Date.now();
  await run(`INSERT INTO deliveries(id,type,quantity,author_id,receiver_id,status,created_at,updated_at,logs,edit_history)
    VALUES(?,?,?,?,?,?,?,?,?,?)`, [id, type, quantity, authorId, receiverId, 'pending', now, now, JSON.stringify([{ at: now, action: 'created' }]), '[]']);
  return await getDelivery(id);
}

async function setApprovalMessage(id, messageId) {
  await run('UPDATE deliveries SET approval_message_id = ?, updated_at = ? WHERE id = ?', [messageId, Date.now(), id]);
}

async function getDelivery(id) {
  return await get('SELECT * FROM deliveries WHERE id = ?', [id]);
}

async function approveDelivery(id, approvedBy) {
  const d = await getDelivery(id);
  if (!d || d.status !== 'pending') return null;
  const logs = JSON.parse(d.logs || '[]');
  logs.push({ at: Date.now(), action: 'approved', by: approvedBy });
  await run('UPDATE deliveries SET status = ?, approved_by = ?, approved_at = ?, updated_at = ?, logs = ? WHERE id = ?', ['approved', approvedBy, Date.now(), Date.now(), JSON.stringify(logs), id]);
  return await getDelivery(id);
}

async function refuseDelivery(id, refusedBy, reason) {
  const d = await getDelivery(id);
  if (!d || d.status !== 'pending') return null;
  const logs = JSON.parse(d.logs || '[]');
  logs.push({ at: Date.now(), action: 'refused', by: refusedBy, reason });
  await run('UPDATE deliveries SET status = ?, refusal_reason = ?, approved_by = ?, updated_at = ?, logs = ? WHERE id = ?', ['refused', reason, refusedBy, Date.now(), JSON.stringify(logs), id]);
  return await getDelivery(id);
}

async function removeDelivery(id) {
  const before = await getDelivery(id);
  if (!before) return false;
  await run('DELETE FROM deliveries WHERE id = ?', [id]);
  return true;
}

function range(period) {
  const now = new Date();
  if (period === 'weekly') {
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - day + 1);
    return start.getTime();
  }
  if (period === 'monthly') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return 0;
}

async function getRankingReset(period) {
  const row = await get('SELECT value FROM settings WHERE key = ?', [`ranking_reset_${period}`]);
  const value = Number(row?.value || 0);
  return Number.isFinite(value) ? value : 0;
}

async function effectiveRange(period = 'general') {
  const baseStart = range(period);
  const resetStart = await getRankingReset(period);
  return Math.max(baseStart, resetStart);
}

async function resetRanking(period = 'all', by = 'system') {
  const now = Date.now();
  const periods = period === 'all' ? ['weekly', 'monthly', 'general'] : [period];
  for (const p of periods) {
    await run('INSERT OR REPLACE INTO settings(key, value) VALUES(?,?)', [`ranking_reset_${p}`, String(now)]);
  }
  await run('INSERT OR REPLACE INTO settings(key, value) VALUES(?,?)', ['ranking_last_reset_by', String(by || 'system')]);
  await run('INSERT OR REPLACE INTO settings(key, value) VALUES(?,?)', ['ranking_last_reset_at', String(now)]);
  return { at: now, periods };
}

async function ranking(period = 'general', limit = 10) {
  const start = await effectiveRange(period);
  return await all(`SELECT author_id, SUM(quantity) as total, COUNT(*) as count FROM deliveries
    WHERE status = 'approved' AND created_at >= ? GROUP BY author_id ORDER BY total DESC LIMIT ?`, [start, limit]);
}

async function userStats(userId) {
  const rows = await all('SELECT status, SUM(quantity) as total, COUNT(*) as count FROM deliveries WHERE author_id = ? GROUP BY status', [userId]);
  const latest = await all('SELECT * FROM deliveries WHERE author_id = ? ORDER BY created_at DESC LIMIT 5', [userId]);
  return { rows, latest };
}

async function totals() {
  return await get(`SELECT COUNT(*) as deliveries, COALESCE(SUM(quantity),0) as quantity,
    SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved,
    SUM(CASE WHEN status='refused' THEN 1 ELSE 0 END) as refused,
    SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending FROM deliveries`);
}

module.exports = { createDelivery, setApprovalMessage, getDelivery, approveDelivery, refuseDelivery, removeDelivery, ranking, userStats, totals, range, effectiveRange, resetRanking };
