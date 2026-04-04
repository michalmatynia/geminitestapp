import { describe, expect, it } from 'vitest';

import {
  buildBaseOrderImportStatusesResponse,
  isBaseIntegrationSlug,
  parseBaseOrderImportStatusesConnectionId,
  requireBaseConnectionToken,
  resolveBaseIntegrationId,
} from './handler.helpers';

describe('product orders-import statuses handler helpers', () => {
  it('matches supported Base integration slugs and parses connection ids', () => {
    expect(isBaseIntegrationSlug(' base-com ')).toBe(true);
    expect(isBaseIntegrationSlug('baselinker')).toBe(true);
    expect(isBaseIntegrationSlug('shopify')).toBe(false);

    expect(parseBaseOrderImportStatusesConnectionId('connection-1')).toBe('connection-1');
    expect(() => parseBaseOrderImportStatusesConnectionId('')).toThrow('Connection is required.');
  });

  it('resolves the Base integration id and required token', () => {
    expect(
      resolveBaseIntegrationId([
        { id: 'integration-1', slug: 'shopify' },
        { id: 'integration-2', slug: 'base' },
      ])
    ).toBe('integration-2');

    expect(() => resolveBaseIntegrationId([{ id: 'integration-1', slug: 'shopify' }])).toThrow(
      'Base.com integration is not configured.'
    );

    expect(requireBaseConnectionToken({ token: 'token-1' })).toBe('token-1');
    expect(() => requireBaseConnectionToken({ token: null, error: 'Missing Base token.' })).toThrow(
      'Missing Base token.'
    );
  });

  it('builds the statuses response shape', () => {
    expect(
      buildBaseOrderImportStatusesResponse([{ value: '1', label: 'New' }])
    ).toEqual({
      statuses: [{ value: '1', label: 'New' }],
    });
  });
});
