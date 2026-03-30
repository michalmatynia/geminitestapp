import { describe, expect, it } from 'vitest';

import enMessages from '@/i18n/messages/en.json';

import {
  getLocalizedAddingSynthesisFeedback,
  getLocalizedAddingSynthesisNoteFocus,
  getLocalizedAddingSynthesisNoteHint,
  getLocalizedAddingSynthesisStage,
  type AddingSynthesisNote,
} from '../adding-synthesis';

const getByPath = (source: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);

const interpolate = (
  template: string,
  values?: Record<string, string | number | Date>
): string =>
  template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values?.[key];
    return value === undefined ? match : String(value);
  });

const translate = (key: string, values?: Record<string, string | number | Date>): string => {
  const result = getByPath(
    enMessages.KangurMiniGames as unknown as Record<string, unknown>,
    key
  );
  return typeof result === 'string' ? interpolate(result, values) : key;
};

describe('adding-synthesis i18n', () => {
  it('localizes stage labels and coaching copy in English', () => {
    expect(getLocalizedAddingSynthesisStage('bridge_ten', translate)).toMatchObject({
      title: 'Bridge to 10',
      description:
        'Cross 10 by splitting the second number into the part that makes 10 and the part that stays.',
      coachingTip: 'See how much is missing to 10, then add what is left.',
    });
  });

  it('localizes hints, focus, and feedback in English', () => {
    const note: AddingSynthesisNote = {
      id: 'warmup-note',
      stageId: 'warmup',
      left: 2,
      right: 3,
      answer: 5,
      choices: [4, 5, 6, 7],
      hint: 'Zacznij od 3 i dolicz 2: 4, 5.',
      focus: 'Zacznij od większej liczby i dolicz małe kroki.',
    };

    expect(getLocalizedAddingSynthesisNoteHint(note, translate)).toBe(
      'Start at 3 and count on 2: 4, 5.'
    );
    expect(getLocalizedAddingSynthesisNoteFocus(note, translate)).toBe(
      'Start with the larger number and count on in small steps.'
    );
    expect(
      getLocalizedAddingSynthesisFeedback({
        kind: 'wrong',
        note,
        chosenValue: 6,
        translate,
      })
    ).toEqual({
      title: 'Not that lane',
      description: '2 + 3 equals 5, not 6.',
    });
  });
});
