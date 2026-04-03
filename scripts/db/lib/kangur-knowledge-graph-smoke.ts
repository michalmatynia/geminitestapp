export type KangurKnowledgeGraphSmokeCase = {
  id: string;
  message: string;
  expectedRoute: string;
  expectedAnchorId?: string | null;
};

export type KangurKnowledgeGraphSmokeCaseResult = {
  id: string;
  message: string;
  expectedRoute: string;
  expectedAnchorId: string | null;
  actualRoute: string | null;
  actualAnchorId: string | null;
  passed: boolean;
  reason: string | null;
};

export const DEFAULT_KANGUR_KNOWLEDGE_GRAPH_SMOKE_CASES: KangurKnowledgeGraphSmokeCase[] = [
  {
    id: 'sign-in',
    message: 'Jak się zalogować?',
    expectedRoute: '/',
    expectedAnchorId: 'kangur-primary-nav-login',
  },
  {
    id: 'lessons',
    message: 'Gdzie są lekcje?',
    expectedRoute: '/lessons',
  },
  {
    id: 'tests',
    message: 'Gdzie są testy?',
    expectedRoute: '/tests',
  },
  {
    id: 'return-to-tests',
    message: 'Jak wrócić do testów?',
    expectedRoute: '/tests',
  },
];

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildSmokeCaseResult = (input: {
  smokeCase: KangurKnowledgeGraphSmokeCase;
  expectedRoute: string | null;
  expectedAnchorId: string | null;
  actualRoute: string | null;
  actualAnchorId: string | null;
  passed: boolean;
  reason: string | null;
}): KangurKnowledgeGraphSmokeCaseResult => ({
  id: input.smokeCase.id,
  message: input.smokeCase.message,
  expectedRoute: input.expectedRoute ?? '',
  expectedAnchorId: input.expectedAnchorId,
  actualRoute: input.actualRoute,
  actualAnchorId: input.actualAnchorId,
  passed: input.passed,
  reason: input.reason,
});

const resolveSmokeCaseRouteMismatchReason = (input: {
  expectedRoute: string | null;
  actualRoute: string | null;
}): 'missing_route' | 'route_mismatch' | null => {
  if (!input.actualRoute) {
    return 'missing_route';
  }

  return input.actualRoute !== input.expectedRoute ? 'route_mismatch' : null;
};

const hasSmokeCaseAnchorMismatch = (input: {
  expectedAnchorId: string | null;
  actualAnchorId: string | null;
}): boolean => input.expectedAnchorId !== null && input.actualAnchorId !== input.expectedAnchorId;

export const evaluateKangurKnowledgeGraphSmokeCase = (input: {
  smokeCase: KangurKnowledgeGraphSmokeCase;
  websiteHelpTarget?: {
    route?: string | null;
    anchorId?: string | null;
  } | null;
}): KangurKnowledgeGraphSmokeCaseResult => {
  const expectedRoute = normalizeOptionalString(input.smokeCase.expectedRoute);
  const expectedAnchorId = normalizeOptionalString(input.smokeCase.expectedAnchorId);
  const actualRoute = normalizeOptionalString(input.websiteHelpTarget?.route);
  const actualAnchorId = normalizeOptionalString(input.websiteHelpTarget?.anchorId);
  const routeMismatchReason = resolveSmokeCaseRouteMismatchReason({
    expectedRoute,
    actualRoute,
  });

  if (routeMismatchReason) {
    return buildSmokeCaseResult({
      smokeCase: input.smokeCase,
      expectedRoute,
      expectedAnchorId,
      actualRoute,
      actualAnchorId,
      passed: false,
      reason: routeMismatchReason,
    });
  }

  if (hasSmokeCaseAnchorMismatch({ expectedAnchorId, actualAnchorId })) {
    return buildSmokeCaseResult({
      smokeCase: input.smokeCase,
      expectedRoute,
      expectedAnchorId,
      actualRoute,
      actualAnchorId,
      passed: false,
      reason: 'anchor_mismatch',
    });
  }

  return buildSmokeCaseResult({
    smokeCase: input.smokeCase,
    expectedRoute,
    expectedAnchorId,
    actualRoute,
    actualAnchorId,
    passed: true,
    reason: null,
  });
};
