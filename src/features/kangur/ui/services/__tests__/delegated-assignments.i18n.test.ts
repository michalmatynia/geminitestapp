import { describe, expect, it } from 'vitest';

import enMessages from '@/i18n/messages/en.json';

import {
  buildKangurAssignmentCatalog,
  formatKangurAssignmentPriorityLabel,
  type KangurAssignmentsRuntimeLocalizer,
} from '../delegated-assignments';

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

const runtimeLocalizer: KangurAssignmentsRuntimeLocalizer = {
  locale: 'en',
  translate: (key, values) => {
    const result = getByPath(
      enMessages.KangurAssignmentsRuntime as unknown as Record<string, unknown>,
      key
    );
    return typeof result === 'string' ? interpolate(result, values) : key;
  },
};

describe('delegated assignments i18n', () => {
  it('renders the clock practice catalog in English when a localizer is provided', () => {
    const catalog = buildKangurAssignmentCatalog([], runtimeLocalizer);
    const practiceClock = catalog.find((item) => item.id === 'practice-clock');

    expect(practiceClock).toMatchObject({
      title: 'Practice: Clock',
      description: 'A practice session with hours, minutes, and full time on the clock.',
      badge: 'Practice',
      priorityLabel: 'Medium priority',
      createInput: {
        title: 'Practice: Clock',
        description:
          'Finish the clock practice and check reading hours, minutes, and full time.',
      },
    });
  });

  it('formats shared assignment priority labels in English', () => {
    expect(formatKangurAssignmentPriorityLabel('high', runtimeLocalizer)).toBe('High priority');
    expect(formatKangurAssignmentPriorityLabel('medium', runtimeLocalizer)).toBe(
      'Medium priority'
    );
    expect(formatKangurAssignmentPriorityLabel('low', runtimeLocalizer)).toBe('Low priority');
  });
});
