// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PlaywrightSettingsFormViewProvider,
  usePlaywrightSettingsFormView,
} from './PlaywrightSettingsFormViewContext';

describe('PlaywrightSettingsFormViewContext', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => usePlaywrightSettingsFormView())).toThrow(
      'usePlaywrightSettingsFormView must be used within PlaywrightSettingsFormViewProvider'
    );
  });

  it('returns the current view config inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PlaywrightSettingsFormViewProvider
        value={{ description: 'Save routes', saveLabel: 'Save', showSave: true, title: 'Routes' }}
      >
        {children}
      </PlaywrightSettingsFormViewProvider>
    );

    const { result } = renderHook(() => usePlaywrightSettingsFormView(), { wrapper });

    expect(result.current).toMatchObject({
      description: 'Save routes',
      saveLabel: 'Save',
      showSave: true,
      title: 'Routes',
    });
  });
});
