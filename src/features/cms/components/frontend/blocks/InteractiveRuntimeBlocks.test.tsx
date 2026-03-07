import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ButtonBlock } from '@/features/cms/components/frontend/blocks/ButtonBlock';
import { BlockSettingsContext } from '@/features/cms/components/frontend/blocks/BlockContext';
import { InputBlock } from '@/features/cms/components/frontend/blocks/InputBlock';
import { ProgressBlock } from '@/features/cms/components/frontend/blocks/ProgressBlock';
import { CmsRuntimeProvider } from '@/features/cms/components/frontend/CmsRuntimeContext';

function renderRuntimeBlock(
  node: React.ReactNode,
  settings: Record<string, unknown>,
  sources: Record<string, unknown>
) {
  return render(
    <CmsRuntimeProvider sources={sources}>
      <BlockSettingsContext.Provider value={settings}>{node}</BlockSettingsContext.Provider>
    </CmsRuntimeProvider>
  );
}

describe('interactive CMS runtime blocks', () => {
  it('invokes runtime actions from Button blocks with arguments', () => {
    const setScreen = vi.fn();

    renderRuntimeBlock(
      <ButtonBlock />,
      {
        buttonLabel: 'Open training',
        runtimeActionSource: 'kangur',
        runtimeActionPath: 'game.setScreen',
        runtimeActionArgs: 'training',
      },
      {
        kangur: {
          game: {
            setScreen,
          },
        },
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open training' }));

    expect(setScreen).toHaveBeenCalledWith('training');
  });

  it('disables Button blocks from runtime bindings', () => {
    const handleStartGame = vi.fn();

    renderRuntimeBlock(
      <ButtonBlock />,
      {
        buttonLabel: 'Play',
        runtimeActionSource: 'kangur',
        runtimeActionPath: 'game.handleStartGame',
        buttonDisabledSource: 'kangur',
        buttonDisabledPath: 'game.canStartFromHome',
        buttonDisabledWhen: 'falsy',
      },
      {
        kangur: {
          game: {
            canStartFromHome: false,
            handleStartGame,
          },
        },
      }
    );

    const button = screen.getByRole('button', { name: 'Play' });
    expect(button).toBeDisabled();

    fireEvent.click(button);

    expect(handleStartGame).not.toHaveBeenCalled();
  });

  it('pushes input changes and submit events into runtime actions', () => {
    const setPlayerName = vi.fn();
    const handleStartGame = vi.fn();

    renderRuntimeBlock(
      <InputBlock />,
      {
        inputPlaceholder: 'Player name',
        inputValue: 'Ada',
        inputChangeActionSource: 'kangur',
        inputChangeActionPath: 'game.setPlayerName',
        inputSubmitActionSource: 'kangur',
        inputSubmitActionPath: 'game.handleStartGame',
      },
      {
        kangur: {
          game: {
            handleStartGame,
            setPlayerName,
          },
        },
      }
    );

    const input = screen.getByRole('textbox', { name: 'Player name' });

    expect(input).toHaveValue('Ada');

    fireEvent.change(input, { target: { value: 'Ewa' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(setPlayerName).toHaveBeenCalledWith('Ewa');
    expect(handleStartGame).toHaveBeenCalledWith('Ewa');
  });

  it('renders Progress blocks from connected numeric runtime values', () => {
    renderRuntimeBlock(
      <ProgressBlock />,
      {
        progressValue: 64,
        progressMax: 100,
      },
      {}
    );

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '64');
  });
});
