'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { KangurKangurWordmark } from '@/features/kangur/ui/components/KangurKangurWordmark';
import { renderKangurGameSetupShell } from '@/features/kangur/ui/components/game-setup/KangurGameSetupShell';
import KangurSetup from '@/features/kangur/ui/components/KangurSetup';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { getRecommendedKangurMode } from '@/features/kangur/ui/services/game-setup-recommendations';
import { translateRecommendationWithFallback } from '@/features/kangur/ui/services/recommendation-i18n';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurGameKangurSetupWidgetProps = {
  onBack?: () => void;
};

type KangurSetupFallbackCopy = {
  description: string;
  title: string;
  wordmarkLabel: string;
};

type KangurTranslation = ReturnType<typeof useTranslations>;

const resolveKangurSetupFallbackCopy = (normalizedLocale: string): KangurSetupFallbackCopy => {
  if (normalizedLocale === 'uk') {
    return {
      description: 'Підготуйте сесію Математичного Кенгуру.',
      title: 'Налаштування сесії Математичного Кенгуру',
      wordmarkLabel: 'Математичний Кенгуру',
    };
  }

  if (normalizedLocale === 'de') {
    return {
      description: 'Wähle die Wettbewerbsedition und das Aufgabenset zum Lösen aus.',
      title: 'Mathe-Kanguru',
      wordmarkLabel: 'Mathe-Kanguru',
    };
  }

  if (normalizedLocale === 'pl') {
    return {
      description: 'Wybierz edycję konkursu i zestaw zadań do rozwiązania.',
      title: 'Kangur',
      wordmarkLabel: 'Kangur',
    };
  }

  return {
    description: 'Choose the competition edition and the task set to solve.',
    title: 'Math Kangaroo',
    wordmarkLabel: 'Math Kangaroo',
  };
};

const buildRecommendedModePayload = (
  mode: string,
  recommendedMode: ReturnType<typeof getRecommendedKangurMode>
) =>
  mode === recommendedMode.mode
    ? {
        description: recommendedMode.description,
        label: recommendedMode.label,
        source: 'kangur_setup' as const,
        title: recommendedMode.title,
      }
    : null;

const resolveKangurSetupPresentation = ({
  gameHomeActionTranslations,
  gamePageTranslations,
  normalizedLocale,
}: {
  gameHomeActionTranslations: KangurTranslation;
  gamePageTranslations: KangurTranslation;
  normalizedLocale: string;
}): KangurSetupFallbackCopy => {
  const fallbackCopy = resolveKangurSetupFallbackCopy(normalizedLocale);

  return {
    description: translateRecommendationWithFallback(
      gamePageTranslations,
      'screens.kangur_setup.description',
      fallbackCopy.description
    ),
    title: translateRecommendationWithFallback(
      gamePageTranslations,
      'screens.kangur_setup.label',
      fallbackCopy.title
    ),
    wordmarkLabel:
      normalizedLocale === 'pl'
        ? fallbackCopy.wordmarkLabel
        : translateRecommendationWithFallback(
            gameHomeActionTranslations,
            'actions.kangur',
            fallbackCopy.wordmarkLabel
          ),
  };
};

const renderKangurSetupContent = ({
  handleStartKangur,
  recommendedMode,
}: {
  handleStartKangur: ReturnType<typeof useKangurGameRuntime>['handleStartKangur'];
  recommendedMode: ReturnType<typeof getRecommendedKangurMode>;
}): React.JSX.Element => (
  <KangurSetup
    onStart={(mode) =>
      handleStartKangur(mode, {
        recommendation: buildRecommendedModePayload(mode, recommendedMode),
      })
    }
    recommendedDescription={recommendedMode.description}
    recommendedLabel={recommendedMode.label}
    recommendedMode={recommendedMode.mode}
    recommendedTitle={recommendedMode.title}
  />
);

const renderKangurSetupVisualTitle = ({
  locale,
  wordmarkLabel,
}: {
  locale: string;
  wordmarkLabel: string;
}): React.JSX.Element => (
  <KangurKangurWordmark
    className='mx-auto'
    data-testid='kangur-kangur-heading-art'
    idPrefix='kangur-game-kangur-heading'
    label={wordmarkLabel}
    locale={locale}
  />
);

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
  const setupPresentation = resolveKangurSetupPresentation({
    gameHomeActionTranslations,
    gamePageTranslations,
    normalizedLocale,
  });
  const resolvedOnBack = onBack ?? handleHome;

  if (screen !== 'kangur_setup') {
    return null;
  }

  return renderKangurGameSetupShell({
    children: renderKangurSetupContent({
      handleStartKangur,
      recommendedMode,
    }),
    description: setupPresentation.description,
    momentumMode: 'kangur',
    onBack: resolvedOnBack,
    progress,
    testId: 'kangur-game-kangur-setup-top-section',
    title: setupPresentation.title,
    visualTitle: renderKangurSetupVisualTitle({
      locale,
      wordmarkLabel: setupPresentation.wordmarkLabel,
    }),
  });
}
