import { describe, expect, it } from 'vitest';

import {
  PLAYWRIGHT_PROXY_SESSION_PLACEHOLDER,
  applyPlaywrightProxySessionAffinity,
} from './proxy-affinity';

describe('playwright proxy affinity', () => {
  it('keeps launch options unchanged when affinity is disabled', () => {
    const launchOptions = {
      proxy: {
        server: 'http://proxy.example.test:8080',
        username: `user-${PLAYWRIGHT_PROXY_SESSION_PLACEHOLDER}`,
      },
    };

    const result = applyPlaywrightProxySessionAffinity({
      enabled: false,
      mode: 'sticky',
      providerPreset: 'custom',
      launchOptions,
      identityProfile: 'search',
      connectionId: 'connection-1',
      personaId: 'persona-1',
      startUrl: 'https://www.google.com/search?q=chair',
    });

    expect(result.reason).toBe('disabled');
    expect(result.applied).toBe(false);
    expect(result.launchOptions).toBe(launchOptions);
  });

  it('injects a stable session token into proxy placeholders', () => {
    const launchOptions = {
      proxy: {
        server: `http://proxy.example.test:8080?session=${PLAYWRIGHT_PROXY_SESSION_PLACEHOLDER}`,
        username: `customer-zone-${PLAYWRIGHT_PROXY_SESSION_PLACEHOLDER}`,
        password: '__SESSION__',
      },
    };

    const result = applyPlaywrightProxySessionAffinity({
      enabled: true,
      mode: 'sticky',
      providerPreset: 'custom',
      launchOptions,
      identityProfile: 'marketplace',
      connectionId: 'connection-1',
      personaId: 'persona-1',
      startUrl: 'https://www.amazon.com/dp/B000TEST',
    });

    expect(result.reason).toBe('applied');
    expect(result.applied).toBe(true);
    expect(result.descriptor).toEqual(
      expect.objectContaining({
        scopeLabel: 'connection:connection-1',
        origin: 'https://www.amazon.com',
        mode: 'sticky',
        providerPreset: 'custom',
      })
    );
    expect(result.launchOptions.proxy).toEqual({
      server: expect.stringMatching(
        /^http:\/\/proxy\.example\.test:8080\?session=pw[a-f0-9]{20}$/
      ),
      username: expect.stringMatching(/^customer-zone-pw[a-f0-9]{20}$/),
      password: expect.stringMatching(/^pw[a-f0-9]{20}$/),
    });
  });

  it('reports when affinity is enabled but the proxy has no session placeholder', () => {
    const result = applyPlaywrightProxySessionAffinity({
      enabled: true,
      mode: 'rotate',
      providerPreset: 'custom',
      launchOptions: {
        proxy: {
          server: 'http://proxy.example.test:8080',
          username: 'plain-user',
        },
      },
      identityProfile: 'search',
      ownerUserId: 'user-1',
      startUrl: 'https://www.google.com/search?q=chair',
    });

    expect(result.reason).toBe('no-placeholder');
    expect(result.applied).toBe(false);
    expect(result.descriptor).toEqual(
      expect.objectContaining({
        scopeLabel: 'owner:user-1',
        origin: 'https://www.google.com',
        mode: 'rotate',
        providerPreset: 'custom',
      })
    );
  });

  it('uses the run scope key to rotate proxy session tokens across runs', () => {
    const baseInput = {
      enabled: true,
      mode: 'rotate' as const,
      providerPreset: 'custom' as const,
      launchOptions: {
        proxy: {
          server: 'http://proxy.example.test:8080?session={session}',
        },
      },
      identityProfile: 'search' as const,
      ownerUserId: 'user-1',
      startUrl: 'https://www.google.com/search?q=chair',
    };

    const first = applyPlaywrightProxySessionAffinity({
      ...baseInput,
      runScopeKey: 'run-1',
    });
    const second = applyPlaywrightProxySessionAffinity({
      ...baseInput,
      runScopeKey: 'run-2',
    });

    expect(first.launchOptions.proxy?.server).not.toEqual(second.launchOptions.proxy?.server);
  });

  it('applies the Bright Data preset to proxy usernames without placeholders', () => {
    const result = applyPlaywrightProxySessionAffinity({
      enabled: true,
      mode: 'sticky',
      providerPreset: 'brightdata',
      launchOptions: {
        proxy: {
          server: 'http://brd.superproxy.io:33335',
          username: 'brd-customer-123-zone-retail',
        },
      },
      identityProfile: 'search',
      connectionId: 'connection-1',
      startUrl: 'https://www.google.com/search?q=chair',
    });

    expect(result.reason).toBe('applied');
    expect(result.launchOptions.proxy).toEqual({
      server: 'http://brd.superproxy.io:33335',
      username: expect.stringMatching(
        /^brd-customer-123-zone-retail-session-pw[a-f0-9]{20}$/
      ),
    });
  });

  it('applies the Oxylabs preset to proxy usernames without placeholders', () => {
    const result = applyPlaywrightProxySessionAffinity({
      enabled: true,
      mode: 'sticky',
      providerPreset: 'oxylabs',
      launchOptions: {
        proxy: {
          server: 'http://pr.oxylabs.io:7777',
          username: 'customer-demo-cc-DE',
        },
      },
      identityProfile: 'marketplace',
      ownerUserId: 'user-1',
      startUrl: 'https://www.amazon.com/dp/B000TEST',
    });

    expect(result.reason).toBe('applied');
    expect(result.launchOptions.proxy).toEqual({
      server: 'http://pr.oxylabs.io:7777',
      username: expect.stringMatching(/^customer-demo-cc-DE-sessid-pw[a-f0-9]{20}$/),
    });
  });
});
