export const highRiskCoverageTargets = [
  // These thresholds are regression floors for the currently instrumented domains,
  // not aspirational targets. Raise them only after the corresponding baseline improves.
  {
    id: 'api-routes',
    label: 'API Routes',
    directory: 'src/app/api',
    thresholds: {
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 70,
    },
  },
  {
    id: 'shared-contracts',
    label: 'Shared Contracts',
    directory: 'src/shared/contracts',
    thresholds: {
      lines: 85,
      statements: 85,
      functions: 70,
      branches: 50,
    },
  },
  {
    id: 'shared-lib',
    label: 'Shared Lib',
    directory: 'src/shared/lib',
    thresholds: {
      lines: 75,
      statements: 75,
      functions: 75,
      branches: 65,
    },
  },
  {
    id: 'kangur',
    label: 'Kangur',
    directory: 'src/features/kangur',
    thresholds: {
      lines: 70,
      statements: 70,
      functions: 70,
      branches: 60,
    },
  },
  {
    id: 'ai-paths',
    label: 'AI Paths',
    directory: 'src/features/ai/ai-paths',
    thresholds: {
      lines: 55,
      statements: 50,
      functions: 45,
      branches: 40,
    },
  },
];
