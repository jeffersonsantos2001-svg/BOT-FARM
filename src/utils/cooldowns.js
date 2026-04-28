const config = require('../../config.json');
const globalCooldown = new Map();
const userCooldown = new Map();

function checkCooldown(scope, id, ms) {
  const map = scope === 'global' ? globalCooldown : userCooldown;
  const now = Date.now();
  const old = map.get(id) || 0;
  if (now - old < ms) return Math.ceil((ms - (now - old)) / 1000);
  map.set(id, now);
  return 0;
}

function checkInteractionCooldown(userId) {
  const g = checkCooldown('global', 'global', config.cooldowns.globalMs);
  if (g) return g;
  return checkCooldown('user', userId, config.cooldowns.userMs);
}

module.exports = { checkInteractionCooldown, checkCooldown };
