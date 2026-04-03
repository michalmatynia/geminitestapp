// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Asset3DPreviewModalViewProvider,
  useAsset3DPreviewModalViewContext,
} from './Asset3DPreviewModalViewContext';

describe('Asset3DPreviewModalViewContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useAsset3DPreviewModalViewContext())).toThrow(
      'useAsset3DPreviewModalViewContext must be used within Asset3DPreviewModalViewProvider'
    );
  });

  it('returns the modal value inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Asset3DPreviewModalViewProvider
        value={{
          asset: {
            id: 'asset-1',
            title: 'Cube',
          } as never,
        }}
      >
        {children}
      </Asset3DPreviewModalViewProvider>
    );

    const { result } = renderHook(() => useAsset3DPreviewModalViewContext(), { wrapper });

    expect(result.current.asset).toMatchObject({
      id: 'asset-1',
      title: 'Cube',
    });
  });
});
