import { describe, expect, it } from 'vitest';

import { baseApiRawResultSchema, baseConnectionContextSchema } from '@/shared/contracts/integrations/base-api';
import { baseActiveTemplatePreferencePayloadSchema, baseExportWarehousePreferencePayloadSchema, baseExportWarehousePreferenceQuerySchema, baseExportWarehousePreferenceResponseSchema, baseScopedPreferenceQuerySchema } from '@/shared/contracts/integrations/preferences';
import { createImportExportTemplateSchema } from '@/shared/contracts/integrations/import-export';
import { defaultBaseImportParameterImportSettings, normalizeBaseImportParameterImportSettings } from '@/shared/contracts/integrations/parameter-import';
import { integrationBaseApiRequestSchema } from '@/shared/contracts/integrations/api';
import { integrationWithConnectionsSchema } from '@/shared/contracts/integrations/domain';
import { linkedInProfileResponseSchema, oauthTokenResponseSchema } from '@/shared/contracts/integrations/oauth';
import { playwrightStorageStateSchema, sessionPayloadSchema } from '@/shared/contracts/integrations/session-testing';
import { traderaListingJobInputSchema } from '@/shared/contracts/integrations/tradera';

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

  it('normalizes Playwright-native sameSite casing in storage-state cookies', () => {
    const parsed = playwrightStorageStateSchema.parse({
      cookies: [
        {
          name: 'session',
          value: 'abc',
          domain: '.example.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    });

    expect(parsed.cookies[0]?.sameSite).toBe('lax');
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

  it('parses shared Base preference scope and export-warehouse DTOs', () => {
    expect(
      baseScopedPreferenceQuerySchema.parse({
        connectionId: 'conn-1',
        inventoryId: 'inv-1',
      }).inventoryId
    ).toBe('inv-1');

    expect(
      baseExportWarehousePreferencePayloadSchema.parse({
        inventoryId: 'inv-1',
        warehouseId: 'wh-1',
      }).warehouseId
    ).toBe('wh-1');

    expect(
      baseExportWarehousePreferenceQuerySchema.parse({
        inventoryId: 'inv-1',
      }).inventoryId
    ).toBe('inv-1');

    expect(
      baseExportWarehousePreferenceResponseSchema.parse({
        warehouseId: null,
      }).warehouseId
    ).toBeNull();
  });

  it('parses shared OAuth token and LinkedIn profile response DTOs', () => {
    expect(
      oauthTokenResponseSchema.parse({
        access_token: 'token',
        expires_in: 3600,
        scope: 'openid profile',
      }).access_token
    ).toBe('token');

    expect(
      linkedInProfileResponseSchema.parse({
        sub: 'user-123',
        name: 'profile-slug',
      }).sub
    ).toBe('user-123');
  });

  it('parses representative api, base-api, and domain exports through the root barrel', () => {
    expect(
      integrationBaseApiRequestSchema.parse({
        integrationId: 'int-1',
        connectionId: 'conn-1',
        method: 'products.get',
      }).method
    ).toBe('products.get');

    expect(
      baseApiRawResultSchema.parse({
        ok: true,
        statusCode: 200,
        payload: { status: 'ok' },
      }).statusCode
    ).toBe(200);

    expect(
      baseConnectionContextSchema.parse({
        baseIntegrationId: 'base-1',
        connectionId: 'conn-1',
        token: 'token',
        issue: null,
      }).connectionId
    ).toBe('conn-1');

    expect(
      integrationWithConnectionsSchema.parse({
        id: 'int-1',
        name: 'Tradera',
        slug: 'tradera',
        createdAt: '2026-03-11T12:00:00.000Z',
        updatedAt: '2026-03-11T12:00:00.000Z',
        connections: [{ id: 'conn-1', name: 'Main', integrationId: 'int-1' }],
      }).connections[0]?.name
    ).toBe('Main');
  });

  it('parses representative tradera and parameter-import exports through the root barrel', () => {
    expect(
      traderaListingJobInputSchema.parse({
        listingId: 'listing-1',
        action: 'list',
        source: 'manual',
      }).source
    ).toBe('manual');

    expect(defaultBaseImportParameterImportSettings.matchBy).toBe('base_id_then_name');

    expect(
      normalizeBaseImportParameterImportSettings({
        enabled: true,
        mode: 'mapped',
        languageScope: 'default_only',
        createMissingParameters: true,
        overwriteExistingValues: true,
        matchBy: 'name_only',
      })
    ).toEqual({
      enabled: true,
      mode: 'mapped',
      languageScope: 'default_only',
      createMissingParameters: true,
      overwriteExistingValues: true,
      matchBy: 'name_only',
    });
  });
});
