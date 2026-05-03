import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const serverSource = fs.readFileSync(path.join(repoRoot, 'server.cjs'), 'utf8');

describe('server.cjs live scripter upgrade contract', () => {
  it('keeps the live scripter upgrade path wired through the custom websocket bridge', () => {
    expect(serverSource).toContain("const PLAYWRIGHT_LIVE_SCRIPTER_WS_PATH = '/api/playwright/live-scripter/ws';");
    expect(serverSource).toContain(
      "const PLAYWRIGHT_LIVE_SCRIPTER_BRIDGE_KEY = '__geminitestappPlaywrightLiveScripterBridge';"
    );
    expect(serverSource).toContain('resolveWebSocketUpgradeTarget(');
    expect(serverSource).toContain("if (upgradeTarget === 'playwright-live-scripter')");
    expect(serverSource).toContain('const bridge = globalThis[PLAYWRIGHT_LIVE_SCRIPTER_BRIDGE_KEY];');
    expect(serverSource).toContain("typeof bridge.attachClient === 'function'");
    expect(serverSource).toContain('liveScripterWss.handleUpgrade(req, socket, head, (client) => {');
    expect(serverSource).toContain("ws.close(1011, 'Live scripter unavailable')");
    expect(serverSource).toContain("ws.close(1008, 'Live scripter session not found')");
    expect(serverSource).toContain("ws.close(1011, 'Live scripter attach failed')");
  });
});
