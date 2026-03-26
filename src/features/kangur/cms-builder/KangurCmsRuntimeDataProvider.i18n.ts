import type { TranslationValues } from 'use-intl';

import type { KangurGameScreen } from '@/features/kangur/ui/types';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurCmsRuntimeTranslate = (
  key: string,
  values?: TranslationValues
) => string;

type KangurCmsRuntimeLocale = 'pl' | 'en' | 'de' | 'uk';
type KangurCmsRuntimeLocalizer =
  | KangurCmsRuntimeTranslate
  | {
      locale?: string | null | undefined;
      translate?: KangurCmsRuntimeTranslate;
    };
type KangurCmsRuntimeFallback =
  | string
  | Partial<Record<KangurCmsRuntimeLocale, string>>;

const interpolateKangurCmsTemplate = (
  template: string,
  values?: TranslationValues
): string => {
  if (!values) {
    return template;
  }

  const interpolationValues: Record<string, unknown> = values;
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = interpolationValues[key];
    return value === undefined ? match : String(value);
  });
};

const resolveKangurCmsRuntimeLocale = (
  localizer?: KangurCmsRuntimeLocalizer
): KangurCmsRuntimeLocale => {
  if (typeof localizer === 'function') {
    return 'pl';
  }

  const locale = normalizeSiteLocale(localizer?.locale);
  return locale === 'en' || locale === 'de' || locale === 'uk' ? locale : 'pl';
};

const resolveKangurCmsRuntimeTranslate = (
  localizer?: KangurCmsRuntimeLocalizer
): KangurCmsRuntimeTranslate | undefined =>
  typeof localizer === 'function' ? localizer : localizer?.translate;

const resolveKangurCmsRuntimeFallback = (
  fallback: KangurCmsRuntimeFallback,
  locale: KangurCmsRuntimeLocale
): string => {
  if (typeof fallback === 'string') {
    return fallback;
  }

  return fallback[locale] ?? fallback.en ?? fallback.pl ?? fallback.de ?? fallback.uk ?? '';
};

export const translateKangurCmsRuntimeWithFallback = (
  localizer: KangurCmsRuntimeLocalizer | undefined,
  key: string,
  fallback: KangurCmsRuntimeFallback,
  values?: TranslationValues
): string => {
  const translate = resolveKangurCmsRuntimeTranslate(localizer);
  const resolvedFallback = resolveKangurCmsRuntimeFallback(
    fallback,
    resolveKangurCmsRuntimeLocale(localizer)
  );

  if (!translate) {
    return interpolateKangurCmsTemplate(resolvedFallback, values);
  }

  const translated = translate(key, values);
  return interpolateKangurCmsTemplate(
    translated === key || translated.endsWith(`.${key}`) ? resolvedFallback : translated,
    values
  );
};

const resolveKangurCmsPlayerName = (
  playerName: string,
  localizer?: KangurCmsRuntimeLocalizer
): string => {
  const normalizedName = playerName.trim();
  return (
    normalizedName ||
    translateKangurCmsRuntimeWithFallback(
      localizer,
      'common.playerFallback',
      {
        pl: 'Graczu',
        en: 'Player',
        de: 'Spieler',
        uk: 'Гравцю',
      }
    )
  );
};

export const resolveKangurCmsResultMessage = (
  percent: number,
  localizer?: KangurCmsRuntimeLocalizer
): string => {
  if (percent === 100) {
    return translateKangurCmsRuntimeWithFallback(
      localizer,
      'result.message.perfect',
      {
        pl: 'Idealny wynik! Jesteś gwiazdą matematyki.',
        en: 'Perfect result! You are a maths star.',
        de: 'Perfektes Ergebnis! Du bist ein Mathe-Star.',
        uk: 'Ідеальний результат! Ти справжня зірка математики.',
      }
    );
  }

  if (percent >= 80) {
    return translateKangurCmsRuntimeWithFallback(
      localizer,
      'result.message.great',
      {
        pl: 'Niesamowita robota! Tak trzymaj.',
        en: 'Amazing work! Keep it up.',
        de: 'Fantastische Arbeit! Mach weiter so.',
        uk: 'Неймовірна робота! Так тримати.',
      }
    );
  }

  if (percent >= 60) {
    return translateKangurCmsRuntimeWithFallback(
      localizer,
      'result.message.good',
      {
        pl: 'Dobra robota! Ćwiczenie czyni mistrza.',
        en: 'Good work! Practice makes progress.',
        de: 'Gute Arbeit! Übung bringt dich weiter.',
        uk: 'Гарна робота! Практика приносить прогрес.',
      }
    );
  }

  return translateKangurCmsRuntimeWithFallback(
    localizer,
    'result.message.tryAgain',
    {
      pl: 'Próbuj dalej. Dasz radę.',
      en: 'Keep trying. You can do it.',
      de: 'Versuch es weiter. Du schaffst das.',
      uk: 'Пробуй далі. У тебе все вийде.',
    }
  );
};

export const resolveKangurCmsResultTitle = (
  playerName: string,
  localizer?: KangurCmsRuntimeLocalizer
): string =>
  translateKangurCmsRuntimeWithFallback(
    localizer,
    'result.title',
    {
      pl: 'Świetna robota, {playerName}!',
      en: 'Great job, {playerName}!',
      de: 'Starke Arbeit, {playerName}!',
      uk: 'Чудова робота, {playerName}!',
    },
    {
      playerName: resolveKangurCmsPlayerName(playerName, localizer),
    }
  );

export const resolveKangurCmsGreetingLabel = (
  playerName: string,
  localizer?: KangurCmsRuntimeLocalizer
): string =>
  translateKangurCmsRuntimeWithFallback(
    localizer,
    'operationSelector.greetingLabel',
    {
      pl: 'Cześć, {playerName}! 👋',
      en: 'Hi, {playerName}! 👋',
      de: 'Hallo, {playerName}! 👋',
      uk: 'Привіт, {playerName}! 👋',
    },
    {
      playerName: resolveKangurCmsPlayerName(playerName, localizer),
    }
  );

export const resolveKangurCmsAssignmentPriorityLabel = (
  priority: 'high' | 'medium' | 'low',
  localizer?: KangurCmsRuntimeLocalizer
): string => {
  if (priority === 'high') {
    return translateKangurCmsRuntimeWithFallback(
      localizer,
      'assignments.priority.high',
      {
        pl: 'Priorytet wysoki',
        en: 'High priority',
        de: 'Hohe Priorität',
        uk: 'Високий пріоритет',
      }
    );
  }

  if (priority === 'medium') {
    return translateKangurCmsRuntimeWithFallback(
      localizer,
      'assignments.priority.medium',
      {
        pl: 'Priorytet średni',
        en: 'Medium priority',
        de: 'Mittlere Priorität',
        uk: 'Середній пріоритет',
      }
    );
  }

  return translateKangurCmsRuntimeWithFallback(
    localizer,
    'assignments.priority.low',
    {
      pl: 'Priorytet niski',
      en: 'Low priority',
      de: 'Niedrige Priorität',
      uk: 'Низький пріоритет',
    }
  );
};

export const resolveKangurCmsPracticeAssignmentHelperLabel = (
  screen: KangurGameScreen,
  operationLabel: string,
  localizer?: KangurCmsRuntimeLocalizer
): string => {
  if (screen === 'training' || screen === 'playing') {
    return translateKangurCmsRuntimeWithFallback(
      localizer,
      'assignments.helper.activeSession',
      {
        pl: 'W tej sesji realizujesz przydzielone zadanie.',
        en: 'This session is focused on the assigned task.',
        de: 'Diese Sitzung konzentriert sich auf die zugewiesene Aufgabe.',
        uk: 'У цій сесії ти виконуєш призначене завдання.',
      }
    );
  }

  return translateKangurCmsRuntimeWithFallback(
    localizer,
    'assignments.helper.nextPractice',
    {
      pl: 'Najbliższy priorytet w praktyce: {operation}.',
      en: 'Closest priority in practice: {operation}.',
      de: 'Nächste Priorität in der Praxis: {operation}.',
      uk: 'Найближчий пріоритет у практиці: {operation}.',
    },
    {
      operation: operationLabel,
    }
  );
};

export const formatKangurCmsAssignmentCountLabel = (
  count: number,
  localizer?: KangurCmsRuntimeLocalizer
): string =>
  translateKangurCmsRuntimeWithFallback(
    localizer,
    'assignments.countLabel',
    {
      pl: '{count} zadań',
      en: '{count} assignments',
      de: '{count} Aufgaben',
      uk: '{count} завдань',
    },
    { count }
  );

export const formatKangurCmsResultStarsLabel = (
  stars: number,
  localizer?: KangurCmsRuntimeLocalizer
): string =>
  translateKangurCmsRuntimeWithFallback(
    localizer,
    'result.starsLabel',
    {
      pl: '{stars} / 3 gwiazdki',
      en: '{stars} / 3 stars',
      de: '{stars} / 3 Sterne',
      uk: '{stars} / 3 зірки',
    },
    { stars }
  );

export const formatKangurCmsTimeTakenLabel = (
  seconds: number,
  localizer?: KangurCmsRuntimeLocalizer
): string =>
  translateKangurCmsRuntimeWithFallback(
    localizer,
    'result.timeTakenLabel',
    {
      pl: '{seconds}s',
      en: '{seconds}s',
      de: '{seconds}s',
      uk: '{seconds}с',
    },
    { seconds }
  );
