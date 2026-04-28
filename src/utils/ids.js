function makeDeliveryId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `FURIA-${stamp}-${random}`;
}

function makeSessionId() {
  return `SESSION-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

module.exports = { makeDeliveryId, makeSessionId };
