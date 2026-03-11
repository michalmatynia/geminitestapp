export const highRiskCoverageTargets = [
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
      lines: 90,
      statements: 90,
      functions: 90,
      branches: 85,
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
      lines: 70,
      statements: 70,
      functions: 70,
      branches: 60,
    },
  },
];
