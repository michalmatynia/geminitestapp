import { describe, expect, it } from 'vitest';

import {
  createKangurMobileNativePortCheckLines,
  parseKangurMobileNativePort,
} from './check-kangur-mobile-native-port';

describe('parseKangurMobileNativePort', () => {
  it('defaults to 8081', () => {
    expect(parseKangurMobileNativePort([])).toBe(8081);
  });

  it('accepts both split and inline port arguments', () => {
    expect(parseKangurMobileNativePort(['--port', '19000'])).toBe(19000);
    expect(parseKangurMobileNativePort(['--port=19001'])).toBe(19001);
  });

  it('rejects invalid port arguments', () => {
    expect(() => parseKangurMobileNativePort(['--port', '0'])).toThrow(
      /Invalid --port value/,
    );
    expect(() => parseKangurMobileNativePort(['--port=70000'])).toThrow(
      /Invalid --port value/,
    );
  });
});

describe('createKangurMobileNativePortCheckLines', () => {
  it('renders a green path for a free port', () => {
    expect(
      createKangurMobileNativePortCheckLines({
        port: 8081,
        status: 'free',
      }),
    ).toEqual([
      '[kangur-mobile-native-port] status=ok port=8081',
      '[kangur-mobile-native-port] Expo dev port 8081 is free for native launch.',
    ]);
  });

  it('renders a recovery hint for an occupied port', () => {
    expect(
      createKangurMobileNativePortCheckLines({
        port: 8081,
        status: 'occupied',
      }),
    ).toEqual(
      expect.arrayContaining([
        '[kangur-mobile-native-port] status=error port=8081',
        expect.stringContaining('Port 8081 is already occupied.'),
        expect.stringContaining('lsof -i tcp:8081'),
      ]),
    );
  });
});
