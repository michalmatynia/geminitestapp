import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useConnectedIntegrationSelectorOptions } from './useConnectedIntegrationSelectorOptions';

describe('useConnectedIntegrationSelectorOptions', () => {
  it('returns connected integrations plus marketplace and account options', () => {
    const { result } = renderHook(() =>
      useConnectedIntegrationSelectorOptions(
        [
          {
            id: 'integration-tradera-1',
            name: 'Tradera',
            slug: 'tradera',
            connections: [
              { id: 'conn-tradera-1', name: 'Browser' },
              { id: '', name: 'Broken account' },
            ],
          },
          {
            id: 'integration-broken-1',
            name: 'Broken',
            slug: 'broken',
            connections: [{ id: '', name: 'Missing id' }],
          },
        ] as never,
        [
          { id: 'conn-tradera-1', name: 'Browser' },
          { id: '', name: 'Broken account' },
        ] as never
      )
    );

    expect(result.current.integrationsWithConnections).toEqual([
      {
        id: 'integration-tradera-1',
        name: 'Tradera',
        slug: 'tradera',
        connections: [
          { id: 'conn-tradera-1', name: 'Browser' },
          { id: '', name: 'Broken account' },
        ],
      },
    ]);
    expect(result.current.integrationOptions).toEqual([
      { value: 'integration-tradera-1', label: 'Tradera' },
    ]);
    expect(result.current.connectionOptions).toEqual([
      { value: 'conn-tradera-1', label: 'Browser' },
    ]);
  });

  it('falls back to empty connection options when the selected integration is missing', () => {
    const { result } = renderHook(() =>
      useConnectedIntegrationSelectorOptions(
        [
          {
            id: 'integration-tradera-1',
            name: 'Tradera',
            slug: 'tradera',
            connections: [{ id: 'conn-tradera-1', name: 'Browser' }],
          },
        ] as never,
        null
      )
    );

    expect(result.current.integrationOptions).toEqual([
      { value: 'integration-tradera-1', label: 'Tradera' },
    ]);
    expect(result.current.connectionOptions).toEqual([]);
  });
});
