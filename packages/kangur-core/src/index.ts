export const KANGUR_CORE_EXTRACTION_TARGETS = {
  geometry: [
    'src/features/kangur/ui/services/geometry-drawing.ts',
    'src/features/kangur/ui/services/geometry-symmetry.ts'
  ],
  progress: [
    'src/features/kangur/ui/services/progress.ts',
    'src/features/kangur/ui/services/progress-i18n.ts',
    'src/features/kangur/ui/services/score-insights.ts'
  ],
  questions: [
    'src/features/kangur/ui/services/kangur-questions.ts',
    'src/features/kangur/ui/services/kangur-questions-localization.ts'
  ]
} as const;

export type KangurCoreExtractionTargetGroup = keyof typeof KANGUR_CORE_EXTRACTION_TARGETS;
