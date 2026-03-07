import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ButtonBlock } from '@/features/cms/components/frontend/blocks/ButtonBlock';
import {
  BlockRenderContext,
  BlockSettingsContext,
} from '@/features/cms/components/frontend/blocks/BlockContext';
import { InputBlock } from '@/features/cms/components/frontend/blocks/InputBlock';
import { ProgressBlock } from '@/features/cms/components/frontend/blocks/ProgressBlock';
import { RepeaterBlock } from '@/features/cms/components/frontend/blocks/RepeaterBlock';
import { CmsRuntimeProvider } from '@/features/cms/components/frontend/CmsRuntimeContext';
import { SectionDataProvider } from '@/features/cms/components/frontend/sections/SectionDataContext';
import type { BlockInstance } from '@/shared/contracts/cms';

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

function renderRuntimeTemplateBlock(
  node: React.ReactNode,
  block: BlockInstance,
  settings: Record<string, unknown>,
  sources: Record<string, unknown>
) {
  return render(
    <CmsRuntimeProvider sources={sources}>
      <SectionDataProvider settings={{}}>
        <BlockRenderContext.Provider
          value={{
            block,
            mediaStyles: null,
            stretch: false,
          }}
        >
          <BlockSettingsContext.Provider value={settings}>{node}</BlockSettingsContext.Provider>
        </BlockRenderContext.Provider>
      </SectionDataProvider>
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

  it('renders repeater items with scoped runtime bindings and actions', () => {
    const openFirst = vi.fn();
    const openSecond = vi.fn();
    const repeaterBlock: BlockInstance = {
      id: 'priority-repeater',
      type: 'Repeater',
      settings: {},
      blocks: [
        {
          id: 'priority-item-shell',
          type: 'Block',
          settings: {
            blockGap: 8,
            layoutDirection: 'column',
            wrap: 'wrap',
            alignItems: 'stretch',
            justifyContent: 'inherit',
            contentAlignment: 'left',
          },
          blocks: [
            {
              id: 'priority-item-title',
              type: 'Text',
              settings: {
                connection: {
                  enabled: true,
                  source: 'item',
                  path: 'title',
                  fallback: 'Untitled',
                },
              },
            },
            {
              id: 'priority-item-button',
              type: 'Button',
              settings: {
                buttonLabel: 'Open',
                runtimeActionSource: 'item',
                runtimeActionPath: 'openAssignment',
                connection: {
                  enabled: true,
                  source: 'item',
                  path: 'actionLabel',
                  fallback: 'Open',
                },
              },
            },
          ],
        },
      ],
    };
    const settings = {
      collectionSource: 'kangur',
      collectionPath: 'game.priorityAssignments.items',
      itemGap: 8,
      itemsGap: 12,
      itemLayoutDirection: 'column',
      itemWrap: 'wrap',
      itemAlignItems: 'stretch',
      itemJustifyContent: 'start',
    };

    renderRuntimeTemplateBlock(<RepeaterBlock />, repeaterBlock, settings, {
      kangur: {
        game: {
          priorityAssignments: {
            items: [
              {
                id: 'assignment-1',
                actionLabel: 'Open first',
                openAssignment: openFirst,
                title: 'First assignment',
              },
              {
                id: 'assignment-2',
                actionLabel: 'Open second',
                openAssignment: openSecond,
                title: 'Second assignment',
              },
            ],
          },
        },
      },
    });

    expect(screen.getByText('First assignment')).toBeInTheDocument();
    expect(screen.getByText('Second assignment')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open first' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open second' }));

    expect(openFirst).toHaveBeenCalledTimes(1);
    expect(openSecond).toHaveBeenCalledTimes(1);
  });

  it('supports row-based repeater list layouts for runtime collections', () => {
    const repeaterBlock: BlockInstance = {
      id: 'filter-repeater',
      type: 'Repeater',
      settings: {},
      blocks: [
        {
          id: 'filter-button',
          type: 'Button',
          settings: {
            buttonLabel: 'Filter',
            connection: {
              enabled: true,
              source: 'item',
              path: 'displayLabel',
              fallback: 'Filter',
            },
          },
        },
      ],
    };
    const settings = {
      collectionSource: 'kangur',
      collectionPath: 'game.leaderboard.operationFilters.items',
      itemsGap: 8,
      listLayoutDirection: 'row',
      listWrap: 'wrap',
      listAlignItems: 'center',
      listJustifyContent: 'center',
      itemGap: 0,
      itemLayoutDirection: 'column',
      itemWrap: 'wrap',
      itemAlignItems: 'stretch',
      itemJustifyContent: 'start',
    };

    const { container } = renderRuntimeTemplateBlock(<RepeaterBlock />, repeaterBlock, settings, {
      kangur: {
        game: {
          leaderboard: {
            operationFilters: {
              items: [
                { id: 'all', displayLabel: '🏆 Wszystkie' },
                { id: 'division', displayLabel: '➗ Dzielenie' },
              ],
            },
          },
        },
      },
    });

    expect(container.firstElementChild).toHaveClass('flex', 'flex-row', 'flex-wrap');
    expect(container.firstElementChild).toHaveStyle({
      alignItems: 'center',
      gap: '8px',
      justifyContent: 'center',
    });
  });
});
