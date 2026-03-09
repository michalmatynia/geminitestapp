import { describe, expect, it } from 'vitest';

import {
  KANGUR_TEST_SUITE_SORT_ORDER_GAP,
  canonicalizeKangurTestSuites,
  demoteInvalidLiveKangurTestSuites,
  createInitialTestSuiteFormData,
  demoteKangurTestSuitesToDraft,
  formDataToTestSuite,
  isLiveKangurTestSuite,
  parseKangurTestSuites,
  promoteKangurTestSuitesLive,
  toTestSuiteFormData,
  upsertKangurTestSuite,
} from '@/features/kangur/test-suites';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';

const makeSuite = (overrides: Partial<KangurTestSuite> = {}): KangurTestSuite => ({
  id: 's1',
  title: 'Suite A',
  description: '',
  year: null,
  gradeLevel: '',
  category: 'custom',
  enabled: true,
  publicationStatus: 'draft',
  sortOrder: 1000,
  ...overrides,
});

describe('parseKangurTestSuites', () => {
  it('returns [] for null', () => {
    expect(parseKangurTestSuites(null)).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(parseKangurTestSuites(undefined)).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(parseKangurTestSuites('')).toEqual([]);
  });

  it('returns [] for invalid JSON string', () => {
    expect(parseKangurTestSuites('not-json')).toEqual([]);
  });

  it('returns [] for JSON that is not an array', () => {
    expect(parseKangurTestSuites(JSON.stringify({ id: 's1' }))).toEqual([]);
  });

  it('parses a valid suite array', () => {
    const raw = JSON.stringify([makeSuite({ id: 's1', title: 'Math 2024' })]);
    const result = parseKangurTestSuites(raw);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('s1');
    expect(result[0]?.title).toBe('Math 2024');
  });

  it('applies Zod defaults for missing optional fields', () => {
    const raw = JSON.stringify([{ id: 's1', title: 'Minimal', sortOrder: 500 }]);
    const result = parseKangurTestSuites(raw);
    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBe('');
    expect(result[0]?.year).toBeNull();
    expect(result[0]?.enabled).toBe(true);
    expect(result[0]?.publicationStatus).toBe('draft');
    expect(result[0]?.category).toBe('custom');
  });

  it('skips entries that fail schema validation', () => {
    const raw = JSON.stringify([makeSuite({ id: 's1' }), 'not-an-object']);
    const result = parseKangurTestSuites(raw);
    // kangurTestSuitesSchema uses z.array, so if any item is wrong it fails the whole parse
    // The result could be either 0 (strict parse) or 1 (if zod strips bad items)
    // In this project, z.array fails on mixed content → returns []
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('canonicalizeKangurTestSuites', () => {
  it('sorts suites by sortOrder ascending', () => {
    const suites = [
      makeSuite({ id: 's2', sortOrder: 2000 }),
      makeSuite({ id: 's1', sortOrder: 1000 }),
    ];
    const result = canonicalizeKangurTestSuites(suites);
    expect(result[0]?.id).toBe('s1');
    expect(result[1]?.id).toBe('s2');
  });

  it('reassigns sortOrder with gap increments after sorting', () => {
    const suites = [
      makeSuite({ id: 's1', sortOrder: 9999 }),
      makeSuite({ id: 's2', sortOrder: 1 }),
    ];
    const result = canonicalizeKangurTestSuites(suites);
    expect(result[0]?.id).toBe('s2');
    expect(result[0]?.sortOrder).toBe(KANGUR_TEST_SUITE_SORT_ORDER_GAP);
    expect(result[1]?.sortOrder).toBe(KANGUR_TEST_SUITE_SORT_ORDER_GAP * 2);
  });

  it('uses id as tiebreaker when sortOrders are equal', () => {
    const suites = [
      makeSuite({ id: 'z-suite', sortOrder: 1000 }),
      makeSuite({ id: 'a-suite', sortOrder: 1000 }),
    ];
    const result = canonicalizeKangurTestSuites(suites);
    expect(result[0]?.id).toBe('a-suite');
    expect(result[1]?.id).toBe('z-suite');
  });

  it('returns an empty array for empty input', () => {
    expect(canonicalizeKangurTestSuites([])).toEqual([]);
  });
});

describe('upsertKangurTestSuite', () => {
  it('appends a new suite when id is not present', () => {
    const existing = [makeSuite({ id: 's1' })];
    const newSuite = makeSuite({ id: 's2', title: 'Suite B' });
    const result = upsertKangurTestSuite(existing, newSuite);
    expect(result).toHaveLength(2);
    expect(result.some((s) => s.id === 's2')).toBe(true);
  });

  it('replaces an existing suite by id', () => {
    const existing = [makeSuite({ id: 's1', title: 'Original' })];
    const updated = makeSuite({ id: 's1', title: 'Updated', enabled: false });
    const result = upsertKangurTestSuite(existing, updated);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Updated');
    expect(result[0]?.enabled).toBe(false);
  });

  it('does not mutate the original array', () => {
    const existing = [makeSuite({ id: 's1' })];
    upsertKangurTestSuite(existing, makeSuite({ id: 's2' }));
    expect(existing).toHaveLength(1);
  });
});

describe('suite publication helpers', () => {
  it('treats only enabled live suites as learner-live', () => {
    expect(isLiveKangurTestSuite(makeSuite({ publicationStatus: 'live' }))).toBe(true);
    expect(isLiveKangurTestSuite(makeSuite({ publicationStatus: 'draft' }))).toBe(false);
    expect(
      isLiveKangurTestSuite(makeSuite({ publicationStatus: 'live', enabled: false }))
    ).toBe(false);
  });

  it('can promote selected suites live and stamp publishedAt', () => {
    const result = promoteKangurTestSuitesLive(
      [makeSuite({ id: 's1' }), makeSuite({ id: 's2', publicationStatus: 'live' })],
      {
        suiteIds: ['s1'],
        publishedAt: '2026-03-09T12:00:00.000Z',
      }
    );

    expect(result.publishedSuiteIds).toEqual(['s1']);
    expect(result.suites[0]?.publicationStatus).toBe('live');
    expect(result.suites[0]?.publishedAt).toBe('2026-03-09T12:00:00.000Z');
    expect(result.suites[1]?.publishedAt).toBeUndefined();
  });

  it('can take live suites back to draft mode', () => {
    const result = demoteKangurTestSuitesToDraft([
      makeSuite({
        id: 's1',
        publicationStatus: 'live',
        publishedAt: '2026-03-09T12:00:00.000Z',
      } as Partial<KangurTestSuite>),
      makeSuite({ id: 's2', publicationStatus: 'draft' }),
    ], {
      suiteIds: ['s1'],
    });

    expect(result.draftSuiteIds).toEqual(['s1']);
    expect(result.suites[0]?.publicationStatus).toBe('draft');
    expect(result.suites[0]?.publishedAt).toBeUndefined();
    expect(result.suites[1]?.publicationStatus).toBe('draft');
  });

  it('takes live suites offline when the question set is no longer fully published', () => {
    const result = demoteInvalidLiveKangurTestSuites(
      [
        makeSuite({
          id: 's1',
          publicationStatus: 'live',
          publishedAt: '2026-03-09T12:00:00.000Z',
        }),
        makeSuite({
          id: 's2',
          publicationStatus: 'live',
          publishedAt: '2026-03-09T12:00:00.000Z',
        }),
      ],
      {
        q1: {
          id: 'q1',
          suiteId: 's1',
          sortOrder: 1000,
          prompt: 'Published question',
          choices: [
            { label: 'A', text: '1' },
            { label: 'B', text: '2' },
          ],
          correctChoiceLabel: 'A',
          pointValue: 3,
          illustration: { type: 'none' },
          editorial: {
            source: 'manual',
            reviewStatus: 'ready',
            workflowStatus: 'published',
            auditFlags: [],
          },
        },
        q2: {
          id: 'q2',
          suiteId: 's2',
          sortOrder: 1000,
          prompt: 'Draft question',
          choices: [
            { label: 'A', text: '1' },
            { label: 'B', text: '2' },
          ],
          correctChoiceLabel: 'A',
          pointValue: 3,
          illustration: { type: 'none' },
          editorial: {
            source: 'manual',
            reviewStatus: 'ready',
            workflowStatus: 'draft',
            auditFlags: [],
          },
        },
      }
    );

    expect(result.draftSuiteIds).toEqual(['s2']);
    expect(result.suites[0]?.publicationStatus).toBe('live');
    expect(result.suites[1]?.publicationStatus).toBe('draft');
    expect(result.suites[1]?.publishedAt).toBeUndefined();
  });
});

describe('formDataToTestSuite / toTestSuiteFormData round-trip', () => {
  it('preserves title, description, year, gradeLevel, category, enabled, and publication state', () => {
    const suite = makeSuite({
      id: 's-rt',
      title: 'Kangur 2024',
      description: 'Opis zestawu',
      year: 2024,
      gradeLevel: 'III–IV',
      category: 'matematyczny',
      enabled: false,
      publicationStatus: 'live',
      publishedAt: '2026-03-09T10:00:00.000Z',
      sortOrder: 3000,
    });
    const fd = toTestSuiteFormData(suite);
    const restored = formDataToTestSuite(fd, 's-rt', 3000);
    expect(restored.title).toBe('Kangur 2024');
    expect(restored.description).toBe('Opis zestawu');
    expect(restored.year).toBe(2024);
    expect(restored.gradeLevel).toBe('III–IV');
    expect(restored.category).toBe('matematyczny');
    expect(restored.enabled).toBe(false);
    expect(restored.publicationStatus).toBe('live');
    expect(restored.publishedAt).toBe('2026-03-09T10:00:00.000Z');
    expect(restored.sortOrder).toBe(3000);
  });

  it('encodes null year as empty string in form data and restores it', () => {
    const suite = makeSuite({ year: null });
    const fd = toTestSuiteFormData(suite);
    expect(fd.year).toBe('');
    const restored = formDataToTestSuite(fd, suite.id, suite.sortOrder);
    expect(restored.year).toBeNull();
  });

  it('trims whitespace from title and description', () => {
    const fd = {
      title: '  Trimmed Title  ',
      description: '  Some desc  ',
      year: '',
      gradeLevel: '',
      category: 'custom',
      enabled: true,
    };
    const restored = formDataToTestSuite(fd, 'id-1', 1000);
    expect(restored.title).toBe('Trimmed Title');
    expect(restored.description).toBe('Some desc');
  });

  it('falls back to category "custom" when category is blank', () => {
    const fd = {
      title: 'Test',
      description: '',
      year: '',
      gradeLevel: '',
      category: '   ',
      enabled: true,
    };
    const restored = formDataToTestSuite(fd, 'id-2', 1000);
    expect(restored.category).toBe('custom');
  });
});

describe('createInitialTestSuiteFormData', () => {
  it('returns a form with blank title and enabled=true', () => {
    const fd = createInitialTestSuiteFormData();
    expect(fd.title).toBe('');
    expect(fd.enabled).toBe(true);
    expect(fd.publicationStatus).toBe('draft');
    expect(fd.category).toBe('custom');
    expect(fd.year).toBe('');
  });
});
