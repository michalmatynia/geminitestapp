// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  FileUploadEventsPanelProvider,
  useFileUploadEventsPanelContext,
} from './FileUploadEventsPanelContext';

describe('FileUploadEventsPanelContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useFileUploadEventsPanelContext())).toThrow(
      'useFileUploadEventsPanelContext must be used within FileUploadEventsPanelProvider'
    );
  });

  it('returns the panel value inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FileUploadEventsPanelProvider
        value={{
          description: 'Recent uploads and statuses',
          title: 'Upload events',
        }}
      >
        {children}
      </FileUploadEventsPanelProvider>
    );

    const { result } = renderHook(() => useFileUploadEventsPanelContext(), { wrapper });

    expect(result.current).toMatchObject({
      description: 'Recent uploads and statuses',
      title: 'Upload events',
    });
  });
});
