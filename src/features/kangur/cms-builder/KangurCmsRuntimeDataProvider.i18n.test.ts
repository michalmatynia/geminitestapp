import { describe, expect, it } from 'vitest';

import {
  formatKangurCmsAssignmentCountLabel,
  formatKangurCmsResultStarsLabel,
  formatKangurCmsTimeTakenLabel,
  resolveKangurCmsAssignmentPriorityLabel,
  resolveKangurCmsGreetingLabel,
  resolveKangurCmsPracticeAssignmentHelperLabel,
  resolveKangurCmsResultMessage,
  resolveKangurCmsResultTitle,
} from './KangurCmsRuntimeDataProvider.i18n';

const EN_MESSAGES: Record<string, string> = {
  'common.playerFallback': 'Player',
  'result.title': 'Great job, {playerName}!',
  'result.starsLabel': '{stars} / 3 stars',
  'result.timeTakenLabel': '{seconds}s',
  'result.message.perfect': 'Perfect result! You are a maths star.',
  'result.message.great': 'Amazing work! Keep it up.',
  'result.message.good': 'Good work! Practice makes progress.',
  'result.message.tryAgain': 'Keep trying. You can do it.',
  'assignments.priority.high': 'High priority',
  'assignments.priority.medium': 'Medium priority',
  'assignments.priority.low': 'Low priority',
  'assignments.helper.activeSession': 'This session is focused on the assigned task.',
  'assignments.helper.nextPractice': 'Closest priority in practice: {operation}.',
  'assignments.countLabel': '{count} assignments',
  'operationSelector.greetingLabel': 'Hi, {playerName}! 👋',
};

const translate = (key: string): string => EN_MESSAGES[key] ?? key;

describe('KangurCmsRuntimeDataProvider i18n helpers', () => {
  it('localizes result copy and player fallbacks', () => {
    expect(resolveKangurCmsResultMessage(100, translate)).toBe(
      'Perfect result! You are a maths star.'
    );
    expect(resolveKangurCmsResultMessage(65, translate)).toBe(
      'Good work! Practice makes progress.'
    );
    expect(resolveKangurCmsResultTitle('', translate)).toBe('Great job, Player!');
    expect(resolveKangurCmsGreetingLabel('Mila', translate)).toBe('Hi, Mila! 👋');
  });

  it('localizes assignment helper chrome', () => {
    expect(resolveKangurCmsAssignmentPriorityLabel('high', translate)).toBe('High priority');
    expect(
      resolveKangurCmsPracticeAssignmentHelperLabel('training', 'Addition', translate)
    ).toBe('This session is focused on the assigned task.');
    expect(
      resolveKangurCmsPracticeAssignmentHelperLabel('operation', 'Addition', translate)
    ).toBe('Closest priority in practice: Addition.');
    expect(formatKangurCmsAssignmentCountLabel(3, translate)).toBe('3 assignments');
  });

  it('formats result stats with translated templates', () => {
    expect(formatKangurCmsResultStarsLabel(2, translate)).toBe('2 / 3 stars');
    expect(formatKangurCmsTimeTakenLabel(47, translate)).toBe('47s');
  });
});
