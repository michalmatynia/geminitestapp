import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  logClientError: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
}));

import {
  buildJsonQueryValidation,
  buildMongoQueryValidation,
  buildValidationIssues,
  formatAndFixMongoQuery,
  getQueryPlaceholderByAction,
  getQueryPlaceholderByOperation,
  getUpdatePlaceholderByAction,
  mergeValidationIssues,
} from './query-utils';

describe('query-utils placeholders', () => {
  it.each([
    ['query', '{\n  "_id": "{{value}}"\n}'],
    ['update', '{\n  "$set": {\n    "fieldName": "{{value}}"\n  }\n}'],
    ['insert', '{\n  "fieldName": "value",\n  "createdAt": "{{timestamp}}"\n}'],
    ['delete', '{\n  "_id": "{{value}}"\n}'],
    ['unsupported', '{\n  "_id": "{{value}}"\n}'],
  ])('returns the operation placeholder for %s', (operation, expected) => {
    expect(getQueryPlaceholderByOperation(operation)).toBe(expected);
  });

  it.each([
    ['aggregate', '[\n  { "$match": { "_id": "{{value}}" } }\n]'],
    ['countDocuments', '{\n  "status": "{{value}}"\n}'],
    ['replaceOne', '{\n  "_id": "{{value}}"\n}'],
    ['insertMany', '[\n  { "fieldName": "value" }\n]'],
    [undefined, '{\n  "_id": "{{value}}"\n}'],
  ])('returns the action placeholder for %s', (action, expected) => {
    expect(getQueryPlaceholderByAction(action)).toBe(expected);
  });

  it('returns update placeholders for replace and modifier actions', () => {
    expect(getUpdatePlaceholderByAction('replaceOne')).toBe('{\n  "fieldName": "value"\n}');
    expect(getUpdatePlaceholderByAction('updateOne')).toBe(
      '{\n  "$set": {\n    "fieldName": "{{value}}"\n  }\n}'
    );
  });
});

describe('buildValidationIssues', () => {
  beforeEach(() => {
    mockState.logClientError.mockReset();
  });

  it('returns no issues for empty input or satisfied rules', () => {
    expect(
      buildValidationIssues('', [
        {
          id: 'unused',
          severity: 'warning',
          title: 'Unused',
          message: 'unused',
          pattern: 'unused',
        },
      ])
    ).toEqual([]);

    expect(
      buildValidationIssues('tenantId = 42', [
        {
          id: 'tenant',
          severity: 'warning',
          title: 'Tenant present',
          message: 'Tenant missing',
          pattern: 'tenantId',
        },
      ])
    ).toEqual([]);
  });

  it('reports invalid regex rules and missing required patterns', () => {
    expect(
      buildValidationIssues('status = "active"', [
        {
          id: 'match',
          severity: 'info',
          title: 'Has status',
          message: 'status missing',
          pattern: 'status',
        },
        {
          id: 'broken',
          severity: 'error',
          title: 'Broken regex',
          message: 'broken',
          pattern: '[',
        },
        {
          id: 'tenant',
          severity: 'error',
          title: 'Tenant filter',
          message: '',
          pattern: 'tenantId',
        },
      ])
    ).toEqual([
      {
        id: 'broken',
        severity: 'warning',
        title: 'Broken regex',
        message: 'Invalid regex pattern for "Broken regex".',
      },
      {
        id: 'tenant',
        severity: 'error',
        title: 'Tenant filter',
        message: 'Missing expected pattern: Tenant filter.',
      },
    ]);
    expect(mockState.logClientError).toHaveBeenCalledTimes(1);
  });
});

describe('mergeValidationIssues', () => {
  it('returns the original result when there are no issues or the query is empty', () => {
    const validBase = { status: 'valid', message: 'Valid JSON query.' } as const;
    expect(mergeValidationIssues(validBase, [])).toBe(validBase);

    const emptyBase = { status: 'empty', message: 'Query is empty.' } as const;
    const issues = [
      { id: 'warn', severity: 'warning', title: 'Warn', message: 'warn' },
    ] as const;
    expect(mergeValidationIssues(emptyBase, [...issues])).toBe(emptyBase);
  });

  it('upgrades valid results to warning or error statuses', () => {
    expect(
      mergeValidationIssues(
        { status: 'valid', message: 'Valid JSON query.' },
        [{ id: 'warn', severity: 'warning', title: 'Warn', message: 'warn' }]
      )
    ).toMatchObject({
      status: 'warning',
      message: 'Validation warnings detected.',
      issues: [{ id: 'warn' }],
    });

    expect(
      mergeValidationIssues(
        { status: 'valid', message: 'Valid JSON query.' },
        [{ id: 'err', severity: 'error', title: 'Error', message: 'err' }]
      )
    ).toMatchObject({
      status: 'error',
      message: 'Validation errors detected.',
      issues: [{ id: 'err' }],
    });
  });

  it('preserves existing non-valid messages while attaching issues', () => {
    expect(
      mergeValidationIssues(
        { status: 'error', message: 'Existing parser failure.' },
        [{ id: 'warn', severity: 'warning', title: 'Warn', message: 'warn' }]
      )
    ).toMatchObject({
      status: 'error',
      message: 'Existing parser failure.',
      issues: [{ id: 'warn' }],
    });
  });
});

describe('formatAndFixMongoQuery', () => {
  beforeEach(() => {
    mockState.logClientError.mockReset();
  });

  it('normalizes comments, literals, dates, and trailing commas into valid JSON', () => {
    const formatted = formatAndFixMongoQuery(`
      /* remove me */
      {
        status: 'active',
        ref: ObjectId('507f1f77bcf86cd799439011'),
        createdAt: new Date("2024-01-01"),
        metadata: undefined,
        items: [1, 2,],
      }
    `);

    expect(formatted).toBe(
      JSON.stringify(
        {
          status: 'active',
          ref: '507f1f77bcf86cd799439011',
          createdAt: '2024-01-01',
          metadata: null,
          items: [1, 2],
        },
        null,
        2
      )
    );
    expect(mockState.logClientError).not.toHaveBeenCalled();
  });

  it('wraps loose key-value pairs into a valid object', () => {
    expect(formatAndFixMongoQuery(`status: 'active'`)).toBe('{\n  "status": "active"\n}');
  });

  it('retries parsing after an initial failure and logs the first error', () => {
    const realParse = JSON.parse.bind(JSON) as typeof JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse');
    parseSpy
      .mockImplementationOnce(() => {
        throw new Error('first parse failed');
      })
      .mockImplementation((...args: Parameters<typeof JSON.parse>) => realParse(...args));

    try {
      expect(formatAndFixMongoQuery(`status: "active"`)).toBe('{\n  "status": "active"\n}');
      expect(parseSpy).toHaveBeenCalledTimes(2);
      expect(mockState.logClientError).toHaveBeenCalledTimes(1);
    } finally {
      parseSpy.mockRestore();
    }
  });

  it('returns the partially fixed query when both parse attempts fail', () => {
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation(() => {
      throw new Error('still broken');
    });

    try {
      expect(formatAndFixMongoQuery(`status: "active"`)).toBe('{\n  "status": "active"\n}');
      expect(parseSpy).toHaveBeenCalledTimes(2);
      expect(mockState.logClientError).toHaveBeenCalledTimes(2);
    } finally {
      parseSpy.mockRestore();
    }
  });
});

describe('buildMongoQueryValidation', () => {
  beforeEach(() => {
    mockState.logClientError.mockReset();
  });

  it('returns empty and valid states for blank and valid JSON payloads', () => {
    expect(buildMongoQueryValidation('   ')).toEqual({
      status: 'empty',
      message: 'Query is empty.',
    });
    expect(buildMongoQueryValidation('{"status":"active"}')).toEqual({
      status: 'valid',
      message: 'Valid JSON query.',
    });
  });

  it('reports location details for parser failures with positions', () => {
    const result = buildMongoQueryValidation('{\n  "a": 1,\n}');
    expect(result).toMatchObject({
      status: 'error',
      line: 3,
      column: 1,
      snippet: '}\n^',
    });
    expect(result.hints).toContain('Remove trailing commas.');
    expect(mockState.logClientError).toHaveBeenCalledTimes(1);
  });

  it('returns mongo-specific hints when strict JSON rules are violated', () => {
    const result = buildMongoQueryValidation(`{\n  "_id": ObjectId('1'),\n  "value": undefined,\n}`);
    expect(result).toMatchObject({
      status: 'error',
    });
    expect(result.hints).toEqual(
      expect.arrayContaining([
        'Use double quotes for keys and string values.',
        'Wrap ObjectId values in quotes (strict JSON).',
        'Replace undefined with null or remove the field.',
        'Remove trailing commas.',
      ])
    );
  });

  it('falls back to the generic mongo hint when no targeted hint applies', () => {
    expect(buildMongoQueryValidation('{"a": }')).toMatchObject({
      status: 'error',
      hints: ['Ensure keys and string values are quoted with double quotes.'],
    });
  });
});

describe('buildJsonQueryValidation', () => {
  beforeEach(() => {
    mockState.logClientError.mockReset();
  });

  it('returns empty and valid states for blank and valid JSON payloads', () => {
    expect(buildJsonQueryValidation('')).toEqual({
      status: 'empty',
      message: 'Query is empty.',
    });
    expect(buildJsonQueryValidation('{"items":[1,2]}')).toEqual({
      status: 'valid',
      message: 'Valid JSON query.',
    });
  });

  it('reports location details for json parser failures with positions', () => {
    const result = buildJsonQueryValidation('{\n  "a": 1,\n}');
    expect(result).toMatchObject({
      status: 'error',
      line: 3,
      column: 1,
      snippet: '}\n^',
    });
    expect(result.hints).toContain('Remove trailing commas.');
    expect(mockState.logClientError).toHaveBeenCalledTimes(1);
  });

  it('returns json-specific hints when quoted JSON syntax is missing', () => {
    const result = buildJsonQueryValidation(`field: 'value', }`);
    expect(result).toMatchObject({
      status: 'error',
    });
    expect(result.hints).toEqual(
      expect.arrayContaining([
        'Start with a JSON object, e.g. { "field": "value" }.',
        'Use double quotes for keys and string values.',
        'Remove trailing commas.',
      ])
    );
  });

  it('falls back to the generic json hint when no targeted hint applies', () => {
    expect(buildJsonQueryValidation('{"a": }')).toMatchObject({
      status: 'error',
      hints: ['Ensure the JSON is valid and properly quoted.'],
    });
  });
});
