import { describe, expect, it } from 'vitest';

import {
  baseActiveTemplatePreferencePayloadSchema,
  createImportExportTemplateSchema,
  playwrightStorageStateSchema,
  sessionPayloadSchema,
} from '@/shared/contracts/integrations';

describe('integrations contract runtime', () => {
  it('parses playwright storage state with typed origins', () => {
    const parsed = playwrightStorageStateSchema.parse({
      cookies: [
        {
          name: 'session',
          value: 'abc',
          domain: '.example.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
        },
      ],
      origins: [
        {
          origin: 'https://example.com',
          localStorage: [
            {
              name: 'token',
              value: 'secret',
            },
          ],
        },
      ],
    });

    expect(parsed.origins[0]?.origin).toBe('https://example.com');
    expect(parsed.origins[0]?.localStorage[0]?.name).toBe('token');
  });

  it('uses the same typed storage-state fields inside session payloads', () => {
    const parsed = sessionPayloadSchema.parse({
      cookies: [],
      origins: [
        {
          origin: 'https://example.com',
          localStorage: [],
        },
      ],
      updatedAt: '2026-03-11T12:00:00.000Z',
    });

    expect(parsed.origins?.[0]?.origin).toBe('https://example.com');

    expect(() =>
      sessionPayloadSchema.parse({
        origins: [
          {
            origin: 'https://example.com',
            localStorage: [{ name: 'missing-value' }],
          },
        ],
      })
    ).toThrow();
  });

  it('parses template preference and template save payloads used by import-export routes', () => {
    expect(
      baseActiveTemplatePreferencePayloadSchema.parse({
        templateId: 'tpl-1',
      }).templateId
    ).toBe('tpl-1');

    expect(
      createImportExportTemplateSchema.parse({
        name: 'Base Import',
        mappings: [{ sourceKey: 'sku', targetField: 'sku' }],
        parameterImport: {
          enabled: true,
          mode: 'mapped',
        },
      }).name
    ).toBe('Base Import');
  });
});
