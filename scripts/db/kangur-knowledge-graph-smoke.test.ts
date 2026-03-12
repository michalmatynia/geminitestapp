import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KANGUR_KNOWLEDGE_GRAPH_SMOKE_CASES,
  evaluateKangurKnowledgeGraphSmokeCase,
} from './lib/kangur-knowledge-graph-smoke';

describe('evaluateKangurKnowledgeGraphSmokeCase', () => {
  it('passes when the resolved target route and anchor match the smoke expectation', () => {
    const signInCase = DEFAULT_KANGUR_KNOWLEDGE_GRAPH_SMOKE_CASES.find(
      (candidate) => candidate.id === 'sign-in'
    );
    expect(signInCase).toBeTruthy();

    const result = evaluateKangurKnowledgeGraphSmokeCase({
      smokeCase: signInCase!,
      websiteHelpTarget: {
        route: '/',
        anchorId: 'kangur-primary-nav-login',
      },
    });

    expect(result.passed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('fails when the resolved target route does not match', () => {
    const testsCase = DEFAULT_KANGUR_KNOWLEDGE_GRAPH_SMOKE_CASES.find(
      (candidate) => candidate.id === 'tests'
    );
    expect(testsCase).toBeTruthy();

    const result = evaluateKangurKnowledgeGraphSmokeCase({
      smokeCase: testsCase!,
      websiteHelpTarget: {
        route: '/lessons',
        anchorId: null,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('route_mismatch');
    expect(result.expectedRoute).toBe('/tests');
    expect(result.actualRoute).toBe('/lessons');
  });

  it('fails when an anchor is expected but the resolved target omits it', () => {
    const signInCase = DEFAULT_KANGUR_KNOWLEDGE_GRAPH_SMOKE_CASES.find(
      (candidate) => candidate.id === 'sign-in'
    );
    expect(signInCase).toBeTruthy();

    const result = evaluateKangurKnowledgeGraphSmokeCase({
      smokeCase: signInCase!,
      websiteHelpTarget: {
        route: '/',
        anchorId: null,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('anchor_mismatch');
  });

  it('fails when no route is resolved', () => {
    const lessonsCase = DEFAULT_KANGUR_KNOWLEDGE_GRAPH_SMOKE_CASES.find(
      (candidate) => candidate.id === 'lessons'
    );
    expect(lessonsCase).toBeTruthy();

    const result = evaluateKangurKnowledgeGraphSmokeCase({
      smokeCase: lessonsCase!,
      websiteHelpTarget: null,
    });

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('missing_route');
  });
});
