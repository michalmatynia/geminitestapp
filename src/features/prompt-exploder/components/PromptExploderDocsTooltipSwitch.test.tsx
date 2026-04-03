// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  PromptExploderDocsTooltipSwitchFromRuntime,
  PromptExploderDocsTooltipSwitchRuntimeContext,
  usePromptExploderDocsTooltipSwitchRuntime,
} from './PromptExploderDocsTooltipSwitch';

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Tooltip: ({
    children,
    content,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
  }) => <div title={String(content)}>{children}</div>,
}));

describe('PromptExploderDocsTooltipSwitch', () => {
  it('throws outside the runtime provider', () => {
    expect(() => renderHook(() => usePromptExploderDocsTooltipSwitchRuntime())).toThrow(
      'usePromptExploderDocsTooltipSwitchRuntime must be used within a PromptExploderDocsTooltipSwitchRuntimeContext.Provider'
    );
  });

  it('reads runtime values and toggles the docs tooltip setting', () => {
    const onDocsTooltipsChange = vi.fn();

    render(
      <PromptExploderDocsTooltipSwitchRuntimeContext.Provider
        value={{
          docsTooltipsEnabled: true,
          onDocsTooltipsChange,
        }}
      >
        <PromptExploderDocsTooltipSwitchFromRuntime />
      </PromptExploderDocsTooltipSwitchRuntimeContext.Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle documentation tooltips' }));

    expect(onDocsTooltipsChange).toHaveBeenCalledWith(false);
    expect(screen.getByTitle('Disable helper tooltips')).toBeInTheDocument();
  });
});
