function parseUpgradeRequestPathname(req) {
  try {
    const host =
      req &&
      req.headers &&
      typeof req.headers.host === 'string' &&
      req.headers.host.trim().length > 0
        ? req.headers.host
        : 'localhost';
    const url = new URL(req && typeof req.url === 'string' ? req.url : '/', `http://${host}`);
    return url.pathname;
  } catch {
    return null;
  }
}

function resolveWebSocketUpgradeTarget(req, duelsLobbyPath) {
  const pathname = parseUpgradeRequestPathname(req);
  if (!pathname) {
    return 'reject';
  }

  return pathname === duelsLobbyPath ? 'duels-lobby' : 'next';
}

module.exports = {
  parseUpgradeRequestPathname,
  resolveWebSocketUpgradeTarget,
};
