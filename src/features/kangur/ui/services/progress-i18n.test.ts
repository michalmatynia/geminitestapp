import { describe, expect, it } from 'vitest';

import { getLocalizedKangurBadgeSummary } from '@/features/kangur/ui/services/progress-i18n';

const createTranslator = (messages: Record<string, string>) => {
  return (key: string, values?: Record<string, string | number>): string => {
    const template = messages[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, token: string) =>
      String(values?.[token] ?? `{${token}}`)
    );
  };
};

describe('progress-i18n', () => {
  it('translates static badge summary kinds', () => {
    const translate = createTranslator({
      'badgeSummaries.game': '{current}/{target} games',
    });

    expect(
      getLocalizedKangurBadgeSummary({
        badgeId: 'first_game',
        current: 1,
        target: 1,
        fallback: 'fallback',
        translate,
      })
    ).toBe('1/1 games');
  });

  it('uses percent-goal copy for accuracy badges with high targets', () => {
    const translate = createTranslator({
      'badgeSummaries.percentGoal': '{current}/{target}% goal',
    });

    expect(
      getLocalizedKangurBadgeSummary({
        badgeId: 'accuracy_ace',
        current: 87,
        target: 85,
        fallback: 'fallback',
        translate,
      })
    ).toBe('87/85% goal');
  });

  it('uses sessions copy for english sentence builder below the percent threshold', () => {
    const translate = createTranslator({
      'badgeSummaries.sessions': '{current}/{target} sessions',
    });

    expect(
      getLocalizedKangurBadgeSummary({
        badgeId: 'english_sentence_builder',
        current: 3,
        target: 6,
        fallback: 'fallback',
        translate,
      })
    ).toBe('3/6 sessions');
  });

  it('returns the fallback for unknown badge ids', () => {
    expect(
      getLocalizedKangurBadgeSummary({
        badgeId: 'unknown_badge',
        current: 2,
        target: 5,
        fallback: 'Keep going',
      })
    ).toBe('Keep going');
  });
});
