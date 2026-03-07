import { describe, expect, it } from 'vitest';

import {
  isCmsNodeVisible,
  resolveCmsRuntimeAction,
  resolveCmsConnectedSettings,
  resolveCmsRuntimeValue,
  type CmsRuntimeContextValue,
} from '@/features/cms/components/frontend/CmsRuntimeContext';

const handleStartGame = (): void => undefined;

const runtime: CmsRuntimeContextValue = {
  sources: {
    kangur: {
      game: {
        handleStartGame,
        score: 7,
        screen: 'home',
      },
      progress: {
        level: 3,
      },
    },
  },
};

describe('CmsRuntimeContext helpers', () => {
  it('resolves nested runtime values by source and path', () => {
    expect(resolveCmsRuntimeValue(runtime, 'kangur', 'game.screen')).toBe('home');
    expect(resolveCmsRuntimeValue(runtime, 'kangur', 'progress.level')).toBe(3);
  });

  it('resolves callable runtime actions by source and path', () => {
    expect(resolveCmsRuntimeAction(runtime, 'kangur', 'game.handleStartGame')).toBe(
      handleStartGame
    );
  });

  it('evaluates runtime visibility rules', () => {
    expect(
      isCmsNodeVisible(
        {
          runtimeVisibilityMode: 'equals',
          runtimeVisibilitySource: 'kangur',
          runtimeVisibilityPath: 'game.screen',
          runtimeVisibilityValue: 'home',
        },
        runtime
      )
    ).toBe(true);

    expect(
      isCmsNodeVisible(
        {
          runtimeVisibilityMode: 'not-equals',
          runtimeVisibilitySource: 'kangur',
          runtimeVisibilityPath: 'game.screen',
          runtimeVisibilityValue: 'home',
        },
        runtime
      )
    ).toBe(false);
  });

  it('maps connected runtime values onto supported CMS block settings', () => {
    expect(
      resolveCmsConnectedSettings(
        'Heading',
        {
          headingText: 'Fallback',
          connection: {
            enabled: true,
            source: 'kangur',
            path: 'game.score',
          },
        },
        runtime
      )['headingText']
    ).toBe('7');

    expect(
      resolveCmsConnectedSettings(
        'Input',
        {
          inputValue: '',
          connection: {
            enabled: true,
            source: 'kangur',
            path: 'game.score',
          },
        },
        runtime
      )['inputValue']
    ).toBe('7');

    expect(
      resolveCmsConnectedSettings(
        'Progress',
        {
          progressValue: 0,
          connection: {
            enabled: true,
            source: 'kangur',
            path: 'game.score',
          },
        },
        runtime
      )['progressValue']
    ).toBe(7);
  });
});
