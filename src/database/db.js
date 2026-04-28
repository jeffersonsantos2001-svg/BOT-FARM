const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function initDatabase(config) {
  await run(`CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    author_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    status TEXT NOT NULL,
    refusal_reason TEXT,
    approval_message_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    approved_at INTEGER,
    approved_by TEXT,
    logs TEXT DEFAULT '[]',
    edit_history TEXT DEFAULT '[]'
  )`);

  await run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS panels (
    name TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS goals (
    period TEXT PRIMARY KEY,
    quantity INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT
  )`);

  const weekly = await get('SELECT period FROM goals WHERE period = ?', ['weekly']);
  if (!weekly) await run('INSERT INTO goals(period, quantity, updated_at) VALUES(?,?,?)', ['weekly', config.goals.weeklyDefault, Date.now()]);

  const monthly = await get('SELECT period FROM goals WHERE period = ?', ['monthly']);
  if (!monthly) await run('INSERT INTO goals(period, quantity, updated_at) VALUES(?,?,?)', ['monthly', config.goals.monthlyDefault, Date.now()]);
}

module.exports = { db, run, get, all, initDatabase };
