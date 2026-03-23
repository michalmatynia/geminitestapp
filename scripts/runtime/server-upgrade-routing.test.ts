import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  parseUpgradeRequestPathname,
  resolveWebSocketUpgradeTarget,
} = require('./server-upgrade-routing.cjs') as {
  parseUpgradeRequestPathname: (req: { headers?: { host?: string }; url?: string }) => string | null;
  resolveWebSocketUpgradeTarget: (
    req: { headers?: { host?: string }; url?: string },
    duelsLobbyPath: string
  ) => 'duels-lobby' | 'next' | 'reject';
};

describe('server-upgrade-routing', () => {
  it('routes the duels lobby websocket path to the custom handler', () => {
    expect(
      resolveWebSocketUpgradeTarget(
        { headers: { host: '127.0.0.1:3000' }, url: '/api/kangur/duels/lobby/ws?room=1' },
        '/api/kangur/duels/lobby/ws'
      )
    ).toBe('duels-lobby');
  });

  it('delegates non-duels websocket upgrades to Next', () => {
    expect(
      resolveWebSocketUpgradeTarget(
        { headers: { host: '127.0.0.1:3000' }, url: '/_next/webpack-hmr?id=test' },
        '/api/kangur/duels/lobby/ws'
      )
    ).toBe('next');
  });

  it('returns reject when the upgrade URL cannot be parsed', () => {
    expect(
      parseUpgradeRequestPathname({
        headers: { host: '127.0.0.1:3000' },
        url: 'http://%',
      })
    ).toBeNull();
    expect(
      resolveWebSocketUpgradeTarget(
        { headers: { host: '127.0.0.1:3000' }, url: 'http://%' },
        '/api/kangur/duels/lobby/ws'
      )
    ).toBe('reject');
  });
});
