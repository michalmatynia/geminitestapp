import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AiPathsSettingsPageProvider,
  useAiPathsSettingsPageContext,
  type AiPathsSettingsPageContextValue,
} from '../AiPathsSettingsPageContext';

function ContextConsumer(): React.JSX.Element {
  const context = useAiPathsSettingsPageContext();
  return (
    <div>
      <span>{context.activeTab}</span>
      <span>{String(context.isFocusMode)}</span>
      <span>{String(context.pathSettingsModalOpen)}</span>
      <button type='button' onClick={() => context.setDocsTooltipsEnabled(false)}>
        Disable docs tooltips
      </button>
      <button type='button' onClick={() => context.incrementLoadNonce()}>
        Increment nonce
      </button>
    </div>
  );
}

function MissingProviderConsumer(): React.JSX.Element {
  useAiPathsSettingsPageContext();
  return <div>unreachable</div>;
}

const contextValue = {
  activeTab: 'docs',
  isFocusMode: true,
  pathSettingsModalOpen: false,
  setDocsTooltipsEnabled: vi.fn(),
  incrementLoadNonce: vi.fn(),
} as unknown as AiPathsSettingsPageContextValue;

describe('AiPathsSettingsPageContext', () => {
  it('provides the page context value to descendants', () => {
    render(
      <AiPathsSettingsPageProvider value={contextValue}>
        <div>child marker</div>
        <ContextConsumer />
      </AiPathsSettingsPageProvider>
    );

    expect(screen.getByText('child marker')).toBeInTheDocument();
    expect(screen.getByText('docs')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('false')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Disable docs tooltips' }).click();
    screen.getByRole('button', { name: 'Increment nonce' }).click();

    expect(contextValue.setDocsTooltipsEnabled).toHaveBeenCalledWith(false);
    expect(contextValue.incrementLoadNonce).toHaveBeenCalledTimes(1);
  });

  it('throws when the hook is used outside the provider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<MissingProviderConsumer />)).toThrowError(
      'useAiPathsSettingsPageContext must be used within AiPathsSettingsPageProvider'
    );

    consoleErrorSpy.mockRestore();
  });
});
