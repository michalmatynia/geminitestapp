import { KangurLocalizedTextWordmark } from '@/features/kangur/ui/components/KangurLocalizedTextWordmark';
import type { KangurLocalizedWordmarkProps } from '@/features/kangur/ui/components/kangur-wordmark';

const KANGUR_DUELS_WORDMARK_LABELS = {
  de: 'Duell-Lobby',
  en: 'Duels lobby',
  pl: 'Lobby pojedynkow',
  uk: 'Лобі дуелей',
} as const;

export function KangurDuelsWordmark({
  idPrefix = 'kangur-duels-wordmark',
  label,
  locale = 'pl',
  ...props
}: KangurLocalizedWordmarkProps): React.JSX.Element {
  return (
    <KangurLocalizedTextWordmark
      arcPath='M94 118C198 140 322 140 448 112'
      idPrefix={idPrefix}
      label={label}
      labels={KANGUR_DUELS_WORDMARK_LABELS}
      locale={locale}
      {...props}
    />
  );
}
