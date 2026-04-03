import { describe, expect, it } from 'vitest';

import { parseCanonicalCaseResolverEdge } from './settings.edge-validation';

import type { AppError } from '@/shared/errors/app-error';

const getThrownAppError = (run: () => unknown): AppError => {
  try {
    run();
  } catch (error) {
    return error as AppError;
  }

  throw new Error('Expected parseCanonicalCaseResolverEdge to throw.');
};

describe('parseCanonicalCaseResolverEdge', () => {
  it('trims canonical edge fields and normalizes blank handles to null', () => {
    expect(
      parseCanonicalCaseResolverEdge(
        {
          id: 'edge-1',
          source: ' source-node ',
          target: ' target-node ',
          sourceHandle: ' primary ',
          targetHandle: ' ',
          label: 'Edge label',
        },
        'unit_test'
      )
    ).toEqual({
      id: 'edge-1',
      source: 'source-node',
      target: 'target-node',
      sourceHandle: 'primary',
      targetHandle: null,
      label: 'Edge label',
    });
  });

  it('rejects unsupported payload fields', () => {
    const error = getThrownAppError(() =>
      parseCanonicalCaseResolverEdge(
        {
          id: 'edge-1',
          source: 'source-node',
          target: 'target-node',
          legacyHandle: 'deprecated',
        },
        'unit_test'
      )
    );

    expect(error.message).toBe('Case Resolver edge payload includes unsupported fields.');
    expect(error.meta).toMatchObject({
      context: 'unit_test',
      source: 'case_resolver.edge_validation',
      unsupportedKeys: ['legacyHandle'],
    });
  });

  it('rejects forbidden handle names after normalization', () => {
    const error = getThrownAppError(() =>
      parseCanonicalCaseResolverEdge(
        {
          id: 'edge-1',
          source: 'source-node',
          target: 'target-node',
          sourceHandle: ' content ',
        },
        'unit_test'
      )
    );

    expect(error.message).toBe('Case Resolver edge payload includes unsupported handle names.');
    expect(error.meta).toMatchObject({
      context: 'unit_test',
      edgeId: 'edge-1',
      sourceHandle: 'content',
      targetHandle: null,
    });
  });

  it('surfaces schema validation issues for malformed edge payloads', () => {
    const error = getThrownAppError(() =>
      parseCanonicalCaseResolverEdge(
        {
          source: 'source-node',
          target: 'target-node',
        },
        'unit_test'
      )
    );

    expect(error.message).toBe('Invalid Case Resolver edge payload.');
    expect(error.meta).toMatchObject({
      context: 'unit_test',
      source: 'case_resolver.edge_validation',
    });
    expect(error.meta?.['issues']).toBeTruthy();
  });
});
