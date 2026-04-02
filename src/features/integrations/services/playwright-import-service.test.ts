import { describe, expect, it } from 'vitest';

import { buildPlaywrightImportInput, parsePlaywrightImportCaptureConfigJson } from './playwright-import-service';

describe('parsePlaywrightImportCaptureConfigJson', () => {
  it('supports legacy route arrays', () => {
    const parsed = parsePlaywrightImportCaptureConfigJson(
      JSON.stringify([
        {
          id: 'route-1',
          title: 'Item page',
          path: '/items/123',
          description: '',
          selector: null,
          waitForMs: null,
          waitForSelectorMs: 15000,
        },
      ])
    );

    expect(parsed.appearanceMode).toBe('');
    expect(parsed.routes).toHaveLength(1);
  });

  it('supports object config with appearance mode', () => {
    const parsed = parsePlaywrightImportCaptureConfigJson(
      JSON.stringify({
        appearanceMode: 'dark',
        routes: [
          {
            id: 'route-1',
            title: 'Item page',
            path: '/items/123',
            description: '',
            selector: '.card',
            waitForMs: 1000,
            waitForSelectorMs: 15000,
          },
        ],
      })
    );

    expect(parsed.appearanceMode).toBe('dark');
    expect(parsed.routes[0]?.selector).toBe('.card');
  });
});

describe('buildPlaywrightImportInput', () => {
  it('resolves relative capture paths against the stored base url', () => {
    const input = buildPlaywrightImportInput({
      id: 'connection-1',
      integrationId: 'integration-1',
      name: 'Programmable',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      playwrightImportBaseUrl: 'https://marketplace.example.com',
      playwrightImportCaptureRoutesJson: JSON.stringify({
        appearanceMode: 'light',
        routes: [
          {
            id: 'route-1',
            title: 'Item page',
            path: '/items/123',
            description: '',
            selector: null,
            waitForMs: null,
            waitForSelectorMs: 15000,
          },
        ],
      }),
    });

    expect(input).toMatchObject({
      baseUrl: 'https://marketplace.example.com',
      appearanceMode: 'light',
    });
    expect((input['captures'] as Array<Record<string, unknown>>)[0]?.['url']).toBe(
      'https://marketplace.example.com/items/123'
    );
  });
});
