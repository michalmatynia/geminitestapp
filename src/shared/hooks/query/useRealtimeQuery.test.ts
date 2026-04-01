import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveRealtimeWebSocketUrl } from './useRealtimeQuery';

const realtimeQueryHookPath = path.join(
  process.cwd(),
  'src/shared/hooks/query/useRealtimeQuery.ts'
);

describe('resolveRealtimeWebSocketUrl', () => {
  it('uses the current origin instead of hardcoded localhost and upgrades https to wss', () => {
    expect(
      resolveRealtimeWebSocketUrl(['jobs', 'realtime'], {
        protocol: 'https:',
        host: 'studiq.example.com',
      })
    ).toBe('wss://studiq.example.com/ws/%5B%22jobs%22%2C%22realtime%22%5D');
  });

  it('uses ws on plain http origins', () => {
    expect(
      resolveRealtimeWebSocketUrl(['jobs', 'realtime'], {
        protocol: 'http:',
        host: 'localhost:3000',
      })
    ).toBe('ws://localhost:3000/ws/%5B%22jobs%22%2C%22realtime%22%5D');
  });

  it('keeps fallback polling out of background tabs', () => {
    const source = readFileSync(realtimeQueryHookPath, 'utf8');

    expect(source).toContain('refetchIntervalInBackground: false');
  });
});
