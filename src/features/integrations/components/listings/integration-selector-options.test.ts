import { describe, expect, it } from 'vitest';

import {
  resolveConnectedIntegrations,
  resolveConnectionOptions,
  resolveIntegrationOptions,
} from './integration-selector-options';

describe('integration-selector-options', () => {
  it('keeps only integrations with ids and at least one connected account id', () => {
    expect(
      resolveConnectedIntegrations([
        {
          id: 'integration-tradera-1',
          name: 'Tradera',
          slug: 'tradera',
          connections: [{ id: 'conn-tradera-1', name: 'Browser' }],
        },
        {
          id: '',
          name: 'Missing id',
          slug: 'tradera',
          connections: [{ id: 'conn-tradera-2', name: 'Browser' }],
        },
        {
          id: 'integration-empty-1',
          name: 'No valid accounts',
          slug: 'tradera',
          connections: [{ id: '', name: 'Broken account' }],
        },
      ] as never)
    ).toEqual([
      {
        id: 'integration-tradera-1',
        name: 'Tradera',
        slug: 'tradera',
        connections: [{ id: 'conn-tradera-1', name: 'Browser' }],
      },
    ]);
  });

  it('maps integrations into labeled options', () => {
    expect(
      resolveIntegrationOptions([
        {
          id: 'integration-tradera-1',
          name: 'Tradera',
          slug: 'tradera',
          connections: [{ id: 'conn-tradera-1', name: 'Browser' }],
        },
      ] as never)
    ).toEqual([{ value: 'integration-tradera-1', label: 'Tradera' }]);
  });

  it('maps only valid connection ids into labeled options', () => {
    expect(
      resolveConnectionOptions([
        { id: 'conn-tradera-1', name: 'Browser' },
        { id: '', name: 'Broken account' },
      ] as never)
    ).toEqual([{ value: 'conn-tradera-1', label: 'Browser' }]);
  });
});
