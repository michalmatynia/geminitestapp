// @vitest-environment jsdom

import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ValidatorDocTooltip,
  ValidatorDocsTooltipsProvider,
  useValidatorDocsTooltips,
} from './ValidatorDocsTooltips';

const mocks = vi.hoisted(() => ({
  getDocumentationEntry: vi.fn(),
  useDocsTooltipsSetting: vi.fn(),
}));

vi.mock('@/shared/contracts/documentation', () => ({
  DOCUMENTATION_MODULE_IDS: {
    validator: 'validator',
  },
}));

vi.mock('@/shared/lib/documentation/DocumentationTooltip', () => ({
  DocumentationTooltip: ({
    children,
    enabled,
  }: {
    children: React.ReactNode;
    enabled: boolean;
  }) => <div data-enabled={String(enabled)}>{children}</div>,
}));

vi.mock('@/shared/lib/documentation/registry', () => ({
  getDocumentationEntry: (moduleId: string, id: string) =>
    mocks.getDocumentationEntry(moduleId, id),
}));

vi.mock('@/shared/lib/documentation/docs-tooltip-settings', () => ({
  useDocsTooltipsSetting: (storageKey: string, fallback: boolean) =>
    mocks.useDocsTooltipsSetting(storageKey, fallback),
}));

describe('ValidatorDocsTooltips', () => {
  beforeEach(() => {
    mocks.useDocsTooltipsSetting.mockReturnValue({
      enabled: true,
      setEnabled: vi.fn(),
    });
    mocks.getDocumentationEntry.mockReturnValue({
      content: 'Docs',
      id: 'rule',
      keywords: ['validate'],
      title: 'Rule',
    });
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useValidatorDocsTooltips())).toThrow(
      'useValidatorDocsTooltips must be used within ValidatorDocsTooltipsProvider'
    );
  });

  it('returns tooltip settings and renders tooltip children inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ValidatorDocsTooltipsProvider>{children}</ValidatorDocsTooltipsProvider>
    );

    const { result } = renderHook(() => useValidatorDocsTooltips(), { wrapper });

    expect(result.current.enabled).toBe(true);
    expect(result.current.setEnabled).toBeTypeOf('function');
    expect(result.current.getDoc('rule')).toMatchObject({
      description: 'Docs',
      id: 'rule',
      relatedFunctions: ['validate'],
      title: 'Rule',
    });

    render(
      <ValidatorDocsTooltipsProvider>
        <ValidatorDocTooltip docId='rule'>
          <span>Child</span>
        </ValidatorDocTooltip>
      </ValidatorDocsTooltipsProvider>
    );

    expect(screen.getByText('Child').parentElement).toHaveAttribute('data-enabled', 'true');
  });
});
