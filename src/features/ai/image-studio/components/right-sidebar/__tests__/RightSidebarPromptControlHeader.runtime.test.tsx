import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RightSidebarPromptControlHeader,
  RightSidebarPromptControlHeaderRuntimeContext,
  type RightSidebarPromptControlHeaderRuntimeValue,
} from '../RightSidebarPromptControlHeader';

const mocks = vi.hoisted(() => ({
  onClose: vi.fn(),
  onOpenPromptExploder: vi.fn(),
  onSave: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    Button: mocks.MockButton,
    UI_CENTER_ROW_RELAXED_CLASSNAME: mocks.UI_CENTER_ROW_RELAXED_CLASSNAME,
  };
});

function renderHeader(
  overrides: Partial<RightSidebarPromptControlHeaderRuntimeValue> = {}
): void {
  render(
    <RightSidebarPromptControlHeaderRuntimeContext.Provider
      value={{
        onClose: mocks.onClose,
        onOpenPromptExploder: mocks.onOpenPromptExploder,
        onSave: mocks.onSave,
        projectId: 'project-alpha',
        promptSaveBusy: false,
        promptText: 'Prompt body',
        ...overrides,
      }}
    >
      <RightSidebarPromptControlHeader />
    </RightSidebarPromptControlHeaderRuntimeContext.Provider>
  );
}

describe('RightSidebarPromptControlHeader runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders from runtime context and forwards header actions', () => {
    renderHeader();

    expect(screen.getByRole('heading', { name: 'Control Prompt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Open Prompt Exploder with current prompt' })
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Prompt Exploder with current prompt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(mocks.onSave).toHaveBeenCalledTimes(1);
    expect(mocks.onOpenPromptExploder).toHaveBeenCalledTimes(1);
    expect(mocks.onClose).toHaveBeenCalledTimes(1);
  });

  it('disables save and prompt exploder when required runtime state is missing', () => {
    renderHeader({
      projectId: '   ',
      promptText: '   ',
      promptSaveBusy: true,
    });

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Open Prompt Exploder with current prompt' })
    ).toBeDisabled();
  });

  it('throws a clear error outside the runtime provider', () => {
    expect(() => render(<RightSidebarPromptControlHeader />)).toThrow(
      'useRightSidebarPromptControlHeaderRuntime must be used within RightSidebarPromptControlHeaderRuntimeProvider'
    );
  });
});
