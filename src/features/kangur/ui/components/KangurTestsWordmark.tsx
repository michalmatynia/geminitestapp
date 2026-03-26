import { createConfiguredKangurLocalizedTextWordmark } from '@/features/kangur/ui/components/KangurLocalizedTextWordmark';

const KANGUR_TESTS_WORDMARK_LABELS = {
  de: 'Prüfungen',
  en: 'Tests',
  pl: 'Testy',
  uk: 'Тести',
} as const;

export const KangurTestsWordmark = createConfiguredKangurLocalizedTextWordmark({
  arcPath: 'M112 118C211 140 322 140 438 112',
  defaultIdPrefix: 'kangur-tests-wordmark',
  displayName: 'KangurTestsWordmark',
  labels: KANGUR_TESTS_WORDMARK_LABELS,
});
