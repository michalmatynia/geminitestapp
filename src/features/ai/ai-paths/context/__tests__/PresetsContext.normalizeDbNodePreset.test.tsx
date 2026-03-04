import type React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PresetsProvider, usePresetsActions } from '../PresetsContext';

const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <PresetsProvider>{children}</PresetsProvider>
);

const buildQuery = () => ({
  provider: 'auto' as const,
  collection: 'products',
  mode: 'custom' as const,
  preset: 'by_id' as const,
  field: '_id',
  idType: 'string' as const,
  queryTemplate: '',
  limit: 10,
  sort: '',
  projection: '',
  single: false,
});

describe('PresetsContext normalizeDbNodePreset', () => {
  it('coerces missing or invalid operation to canonical query operation', () => {
    const { result } = renderHook(() => usePresetsActions(), { wrapper });

    const missingOperation = result.current.normalizeDbNodePreset({
      name: 'Missing operation',
      config: {
        query: buildQuery(),
      },
    });
    expect(missingOperation.config.operation).toBe('query');
    expect(missingOperation.config.query?.collection).toBe('products');

    const invalidOperation = result.current.normalizeDbNodePreset({
      name: 'Invalid operation',
      config: {
        operation: 'legacy_query',
        query: buildQuery(),
      },
    });
    expect(invalidOperation.config.operation).toBe('query');
    expect(invalidOperation.config.query?.collection).toBe('products');
  });
});
