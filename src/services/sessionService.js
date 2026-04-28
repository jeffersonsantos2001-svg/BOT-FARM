const config = require('../../config.json');
const { makeSessionId } = require('../utils/ids');

const sessions = new Map();
const locked = new Set();

function createSession(userId) {
  const id = makeSessionId();
  const session = { id, userId, type: null, quantity: null, receiverId: null, createdAt: Date.now(), updatedAt: Date.now() };
  sessions.set(userId, session);
  setTimeout(() => {
    const current = sessions.get(userId);
    if (current?.id === id) sessions.delete(userId);
  }, config.sessions.expirationMs);
  return session;
}

function getSession(userId) {
  const s = sessions.get(userId);
  if (!s) return null;
  if (Date.now() - s.updatedAt > config.sessions.expirationMs) {
    sessions.delete(userId);
    return null;
  }
  return s;
}

function updateSession(userId, patch) {
  const s = getSession(userId) || createSession(userId);
  Object.assign(s, patch, { updatedAt: Date.now() });
  sessions.set(userId, s);
  return s;
}

function clearSession(userId) { sessions.delete(userId); }

function lock(key) {
  if (locked.has(key)) return false;
  locked.add(key);
  setTimeout(() => locked.delete(key), 15000);
  return true;
}

function unlock(key) { locked.delete(key); }

module.exports = { createSession, getSession, updateSession, clearSession, lock, unlock };
