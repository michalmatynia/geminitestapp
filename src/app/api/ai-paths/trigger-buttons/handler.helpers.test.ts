import { describe, expect, it } from 'vitest';

import { authError } from '@/shared/errors/app-error';

import {
  buildCreatedTriggerButtonRecord,
  filterPlaywrightFixtureButtons,
  getNextTriggerButtonSortIndex,
  parseStoredTriggerButtonsSafely,
  resolveCreateTriggerButtonName,
  resolveUnauthorizedTriggerButtonsResponse,
  shouldIncludeFixtureButtonsForRequest,
} from './handler.helpers';

describe('ai-paths trigger-buttons handler helpers', () => {
  const fixtureButton = {
    id: 'btn-fixture',
    name: 'Generate Polish Copy 123',
    iconId: null,
    pathId: 'path_pw_products_abc123',
    enabled: true,
    locations: ['product_row'],
    mode: 'click',
    display: {
      label: 'Generate Polish Copy 123',
      showLabel: true,
    },
    createdAt: '2026-03-03T00:00:00.000Z',
    updatedAt: '2026-03-03T00:00:00.000Z',
    sortIndex: 1,
  } as const;

  const liveButton = {
    id: 'btn-live',
    name: 'Run Path',
    iconId: null,
    pathId: 'path_live',
    enabled: true,
    locations: ['product_modal'],
    mode: 'click',
    display: {
      label: 'Run Path',
      showLabel: false,
    },
    createdAt: '2026-03-03T00:00:00.000Z',
    updatedAt: '2026-03-03T00:00:00.000Z',
    sortIndex: 0,
  } as const;

  it('returns an empty response for unauthorized trigger-button access errors', async () => {
    const response = resolveUnauthorizedTriggerButtonsResponse(authError('Unauthorized.'));

    expect(response).not.toBeNull();
    await expect(response?.json()).resolves.toEqual([]);
  });

  it('includes playwright fixture buttons when cookie or query explicitly requests them', () => {
    expect(shouldIncludeFixtureButtonsForRequest('1', {})).toBe(true);
    expect(shouldIncludeFixtureButtonsForRequest(null, { includeFixtureButtons: true })).toBe(
      true
    );
    expect(shouldIncludeFixtureButtonsForRequest(null, {})).toBe(false);
  });

  it('filters fixture buttons by default and safely swallows malformed stored payloads', () => {
    expect(filterPlaywrightFixtureButtons([liveButton, fixtureButton], false)).toEqual([liveButton]);
    expect(filterPlaywrightFixtureButtons([liveButton, fixtureButton], true)).toEqual([
      liveButton,
      fixtureButton,
    ]);
    expect(parseStoredTriggerButtonsSafely('{"not":"an-array"}')).toBeNull();
  });

  it('builds created trigger-button records with trimmed values and next sort index', () => {
    const record = buildCreatedTriggerButtonRecord({
      existing: [liveButton, fixtureButton],
      name: '  New Button  ',
      iconId: '  icon-run  ',
      pathId: '  path-new  ',
      enabled: undefined,
      locations: ['product_modal'],
      mode: 'click',
      display: 'icon_label',
      now: '2026-03-04T00:00:00.000Z',
    });

    expect(record).toEqual(
      expect.objectContaining({
        name: 'New Button',
        iconId: 'icon-run',
        pathId: 'path-new',
        enabled: true,
        sortIndex: 2,
        createdAt: '2026-03-04T00:00:00.000Z',
        updatedAt: '2026-03-04T00:00:00.000Z',
      })
    );
    expect(getNextTriggerButtonSortIndex([liveButton, fixtureButton])).toBe(2);
    expect(() => resolveCreateTriggerButtonName('   ')).toThrow('Name is required.');
  });
});
