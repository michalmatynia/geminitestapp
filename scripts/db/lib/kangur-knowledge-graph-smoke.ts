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

  if (!actualRoute) {
    return {
      id: input.smokeCase.id,
      message: input.smokeCase.message,
      expectedRoute: expectedRoute ?? '',
      expectedAnchorId,
      actualRoute,
      actualAnchorId,
      passed: false,
      reason: 'missing_route',
    };
  }

  if (actualRoute !== expectedRoute) {
    return {
      id: input.smokeCase.id,
      message: input.smokeCase.message,
      expectedRoute: expectedRoute ?? '',
      expectedAnchorId,
      actualRoute,
      actualAnchorId,
      passed: false,
      reason: 'route_mismatch',
    };
  }

  if (expectedAnchorId !== null && actualAnchorId !== expectedAnchorId) {
    return {
      id: input.smokeCase.id,
      message: input.smokeCase.message,
      expectedRoute: expectedRoute ?? '',
      expectedAnchorId,
      actualRoute,
      actualAnchorId,
      passed: false,
      reason: 'anchor_mismatch',
    };
  }

  return {
    id: input.smokeCase.id,
    message: input.smokeCase.message,
    expectedRoute: expectedRoute ?? '',
    expectedAnchorId,
    actualRoute,
    actualAnchorId,
    passed: true,
    reason: null,
  };
};
