// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ProductValidationSettingsProvider,
  useProductValidationActions,
  useProductValidationState,
} from './ProductValidationSettingsContext';

describe('ProductValidationSettingsContext', () => {
  it('throws when strict hooks are used outside the provider', () => {
    expect(() => renderHook(() => useProductValidationState())).toThrow(
      'useProductValidationState must be used within ProductValidationSettingsProvider'
    );
    expect(() => renderHook(() => useProductValidationActions())).toThrow(
      'useProductValidationActions must be used within ProductValidationSettingsProvider'
    );
  });

  it('splits state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProductValidationSettingsProvider
        value={{
          acceptIssue: vi.fn(),
          denyActionLabel: 'Deny',
          denyIssue: vi.fn(),
          formatterEnabled: false,
          getDenyActionLabel: vi.fn(() => 'Deny'),
          isIssueAccepted: vi.fn(() => false),
          isIssueDenied: vi.fn(() => false),
          latestProductValues: null,
          setFormatterEnabled: vi.fn(),
          setValidationDenyBehavior: vi.fn(),
          setValidatorEnabled: vi.fn(),
          validationDenyBehavior: 'report',
          validationInstanceScope: 'draft',
          validatorEnabled: true,
          validatorPatterns: [],
          visibleFieldIssues: {},
        }}
      >
        {children}
      </ProductValidationSettingsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useProductValidationActions(),
        state: useProductValidationState(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      denyActionLabel: 'Deny',
      formatterEnabled: false,
      validationDenyBehavior: 'report',
      validationInstanceScope: 'draft',
      validatorEnabled: true,
    });
    expect(result.current.actions.setValidatorEnabled).toBeTypeOf('function');
    expect(result.current.actions.setFormatterEnabled).toBeTypeOf('function');
    expect(result.current.actions.acceptIssue).toBeTypeOf('function');
  });
});
