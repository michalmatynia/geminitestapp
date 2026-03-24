import { KangurLocalizedTextWordmark } from '@/features/kangur/ui/components/KangurLocalizedTextWordmark';
import type { KangurLocalizedWordmarkProps } from '@/features/kangur/ui/components/kangur-wordmark';

const KANGUR_TESTS_WORDMARK_LABELS = {
  de: 'Prüfungen',
  en: 'Tests',
  pl: 'Testy',
  uk: 'Тести',
} as const;

export function KangurTestsWordmark({
  idPrefix = 'kangur-tests-wordmark',
  label,
  locale = 'pl',
  ...props
}: KangurLocalizedWordmarkProps): React.JSX.Element {
  return (
    <KangurLocalizedTextWordmark
      arcPath='M112 118C211 140 322 140 438 112'
      idPrefix={idPrefix}
      label={label}
      labels={KANGUR_TESTS_WORDMARK_LABELS}
      locale={locale}
      {...props}
    />
  );
}
