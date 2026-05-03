import { describe, expect, it } from 'vitest';

import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';

import {
  extractTraderaSellerAliasFromHtml,
  resolveTraderaManualLinkConnection,
  type TraderaManualLinkConnectionCandidate,
} from './manual-link';

const createCandidate = (
  overrides: Partial<TraderaManualLinkConnectionCandidate>
): TraderaManualLinkConnectionCandidate => ({
  integrationId: 'integration-tradera',
  integrationName: 'Tradera',
  integrationSlug: 'tradera',
  connectionId: 'connection-1',
  connectionName: 'Main Tradera',
  connectionUsername: 'seller-one',
  connection: {
    id: 'connection-1',
    integrationId: 'integration-tradera',
    name: 'Main Tradera',
    username: 'seller-one',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as IntegrationConnectionRecord,
  ...overrides,
});

describe('extractTraderaSellerAliasFromHtml', () => {
  it('extracts seller alias from JSON-LD seller metadata', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "seller": {
                "@type": "Person",
                "name": "Seller Alias"
              }
            }
          </script>
        </head>
      </html>
    `;

    expect(extractTraderaSellerAliasFromHtml(html)).toBe('Seller Alias');
  });

  it('falls back to sellerAlias fields in inline JSON', () => {
    const html = `<script>window.__STATE__ = {"sellerAlias":"Keychains Seller"};</script>`;

    expect(extractTraderaSellerAliasFromHtml(html)).toBe('Keychains Seller');
  });
});

describe('resolveTraderaManualLinkConnection', () => {
  it('resolves an explicitly provided connection id', () => {
    const result = resolveTraderaManualLinkConnection({
      candidates: [createCandidate()],
      providedConnectionId: 'connection-1',
    });

    expect(result).toMatchObject({
      kind: 'resolved',
      inferenceMethod: 'provided',
    });
  });

  it('resolves a unique seller alias match', () => {
    const result = resolveTraderaManualLinkConnection({
      candidates: [
        createCandidate({ connectionId: 'connection-1', connectionUsername: 'seller-one' }),
        createCandidate({
          connectionId: 'connection-2',
          connectionName: 'Spare Tradera',
          connectionUsername: 'seller-two',
        }),
      ],
      sellerAlias: 'seller-two',
    });

    expect(result).toMatchObject({
      kind: 'resolved',
      inferenceMethod: 'seller_alias',
      connection: {
        connectionId: 'connection-2',
      },
    });
  });

  it('uses the preferred Tradera connection to break seller alias ties', () => {
    const result = resolveTraderaManualLinkConnection({
      candidates: [
        createCandidate({
          connectionId: 'connection-1',
          connectionName: 'Tradera Browser',
          connectionUsername: 'seller-one',
        }),
        createCandidate({
          connectionId: 'connection-2',
          integrationId: 'integration-tradera-2',
          integrationName: 'Tradera',
          integrationSlug: 'tradera',
          connectionName: 'Tradera Browser Backup',
          connectionUsername: 'seller-one',
        }),
      ],
      sellerAlias: 'seller-one',
      preferredConnectionId: 'connection-2',
    });

    expect(result).toMatchObject({
      kind: 'resolved',
      inferenceMethod: 'preferred_default',
      connection: {
        connectionId: 'connection-2',
      },
    });
  });

  it('falls back to the sole configured connection when seller alias is unavailable', () => {
    const result = resolveTraderaManualLinkConnection({
      candidates: [createCandidate()],
      sellerAlias: null,
    });

    expect(result).toMatchObject({
      kind: 'resolved',
      inferenceMethod: 'sole_connection',
    });
  });

  it('returns ambiguous when multiple connections remain possible', () => {
    const result = resolveTraderaManualLinkConnection({
      candidates: [
        createCandidate({ connectionId: 'connection-1', connectionUsername: 'seller-one' }),
        createCandidate({
          connectionId: 'connection-2',
          connectionName: 'Backup Tradera',
          connectionUsername: 'seller-two',
        }),
      ],
      sellerAlias: null,
    });

    expect(result).toMatchObject({
      kind: 'ambiguous',
    });
  });
});
