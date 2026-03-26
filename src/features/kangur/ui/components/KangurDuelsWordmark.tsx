import { createConfiguredKangurLocalizedTextWordmark } from '@/features/kangur/ui/components/KangurLocalizedTextWordmark';

const KANGUR_DUELS_WORDMARK_LABELS = {
  de: 'Duell-Lobby',
  en: 'Duels lobby',
  pl: 'Lobby pojedynkow',
  uk: 'Лобі дуелей',
} as const;

export const KangurDuelsWordmark = createConfiguredKangurLocalizedTextWordmark({
  arcPath: 'M94 118C198 140 322 140 448 112',
  defaultIdPrefix: 'kangur-duels-wordmark',
  displayName: 'KangurDuelsWordmark',
  labels: KANGUR_DUELS_WORDMARK_LABELS,
});
