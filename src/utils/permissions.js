const config = require('../../config.json');

function readRoleId(index) {
  return process.env[`AUTHORIZED_ROLE_${index}_ID`] || process.env[`ROLE_${index}_ID`] || '';
}

function getAuthorizedRoleIds() {
  return [1, 2, 3, 4, 5]
    .map(readRoleId)
    .filter(Boolean)
    .map(id => String(id).trim())
    .filter(id => /^\d{15,25}$/.test(id));
}

function hasAuthorizedRole(member) {
  if (!member?.roles?.cache) return false;
  const authorizedIds = getAuthorizedRoleIds();
  if (!authorizedIds.length) return false;
  return member.roles.cache.some(role => authorizedIds.includes(role.id));
}

function canApprove(member, receiverId) {
  if (!member) return false;
  return member.id === receiverId || hasAuthorizedRole(member);
}

function mainAuthorizedRoleName(member) {
  if (!member?.roles?.cache) return 'Sem cargo';
  const authorizedIds = getAuthorizedRoleIds();
  const authorizedRole = member.roles.cache
    .filter(role => authorizedIds.includes(role.id))
    .sort((a, b) => b.position - a.position)
    .first();
  if (authorizedRole) return authorizedRole.name;

  const highest = member.roles.cache
    .filter(role => role.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .first();
  return highest?.name || 'Sem cargo';
}

module.exports = { getAuthorizedRoleIds, hasAuthorizedRole, canApprove, mainAuthorizedRoleName };
