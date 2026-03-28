'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { KangurKangurWordmark } from '@/features/kangur/ui/components/KangurKangurWordmark';
import { renderKangurGameSetupShell } from '@/features/kangur/ui/components/KangurGameSetupShell';
import KangurSetup from '@/features/kangur/ui/components/KangurSetup';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { getRecommendedKangurMode } from '@/features/kangur/ui/services/game-setup-recommendations';
import { translateRecommendationWithFallback } from '@/features/kangur/ui/services/recommendation-i18n';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurGameKangurSetupWidgetProps = {
  onBack?: () => void;
};

export function KangurGameKangurSetupWidget({
  onBack,
}: KangurGameKangurSetupWidgetProps = {}): React.JSX.Element | null {
  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const gamePageTranslations = useTranslations('KangurGamePage');
  const gameHomeActionTranslations = useTranslations('KangurGameHomeActions');
  const recommendationTranslations = useTranslations('KangurGameRecommendations.trainingSetup');
  const { handleHome, handleStartKangur, progress, screen } = useKangurGameRuntime();
  const recommendedMode = useMemo(
    () =>
      getRecommendedKangurMode(progress, {
        locale,
        translate: recommendationTranslations,
      }),
    [locale, progress, recommendationTranslations]
  );
  const kangurSetupFallbackTitle =
    normalizedLocale === 'uk'
      ? 'Налаштування сесії Математичного Кенгуру'
      : normalizedLocale === 'de'
        ? 'Mathe-Kanguru'
        : normalizedLocale === 'pl'
          ? 'Kangur'
          : 'Math Kangaroo';
  const kangurSetupFallbackWordmarkLabel =
    normalizedLocale === 'uk'
      ? 'Математичний Кенгуру'
      : normalizedLocale === 'de'
        ? 'Mathe-Kanguru'
        : 'Math Kangaroo';
  const kangurSetupFallbackDescription =
    normalizedLocale === 'uk'
      ? 'Підготуйте сесію Математичного Кенгуру.'
      : normalizedLocale === 'de'
        ? 'Wähle die Wettbewerbsedition und das Aufgabenset zum Lösen aus.'
        : normalizedLocale === 'pl'
          ? 'Wybierz edycję konkursu i zestaw zadań do rozwiązania.'
          : 'Choose the competition edition and the task set to solve.';
  const kangurSetupTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'screens.kangur_setup.label',
    kangurSetupFallbackTitle
  );
  const kangurWordmarkLabel =
    normalizedLocale === 'pl'
      ? 'Kangur'
      : translateRecommendationWithFallback(
          gameHomeActionTranslations,
          'actions.kangur',
          kangurSetupFallbackWordmarkLabel
        );
  const resolvedOnBack = onBack ?? handleHome;

  if (screen !== 'kangur_setup') {
    return null;
  }

  return renderKangurGameSetupShell({
    children: (
      <KangurSetup
        onStart={(mode) =>
          handleStartKangur(mode, {
            recommendation:
              mode === recommendedMode.mode
                ? {
                    description: recommendedMode.description,
                    label: recommendedMode.label,
                    source: 'kangur_setup',
                    title: recommendedMode.title,
                  }
                : null,
          })
        }
        recommendedDescription={recommendedMode.description}
        recommendedLabel={recommendedMode.label}
        recommendedMode={recommendedMode.mode}
        recommendedTitle={recommendedMode.title}
      />
    ),
    description: translateRecommendationWithFallback(
      gamePageTranslations,
      'screens.kangur_setup.description',
      kangurSetupFallbackDescription
    ),
    momentumMode: 'kangur',
    onBack: resolvedOnBack,
    progress,
    testId: 'kangur-game-kangur-setup-top-section',
    title: kangurSetupTitle,
    visualTitle: (
      <KangurKangurWordmark
        className='mx-auto'
        data-testid='kangur-kangur-heading-art'
        idPrefix='kangur-game-kangur-heading'
        label={kangurWordmarkLabel}
        locale={locale}
      />
    ),
  });
}
