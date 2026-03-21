import type { TranslationValues } from 'use-intl';

import type { KangurGameScreen } from '@/features/kangur/ui/types';

type KangurCmsRuntimeTranslate = (
  key: string,
  values?: TranslationValues
) => string;

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

export const translateKangurCmsRuntimeWithFallback = (
  translate: KangurCmsRuntimeTranslate | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues
): string => {
  if (!translate) {
    return interpolateKangurCmsTemplate(fallback, values);
  }

  const translated = translate(key, values);
  return interpolateKangurCmsTemplate(
    translated === key || translated.endsWith(`.${key}`) ? fallback : translated,
    values
  );
};

const resolveKangurCmsPlayerName = (
  playerName: string,
  translate?: KangurCmsRuntimeTranslate
): string => {
  const normalizedName = playerName.trim();
  return (
    normalizedName ||
    translateKangurCmsRuntimeWithFallback(
      translate,
      'common.playerFallback',
      'Graczu'
    )
  );
};

export const resolveKangurCmsResultMessage = (
  percent: number,
  translate?: KangurCmsRuntimeTranslate
): string => {
  if (percent === 100) {
    return translateKangurCmsRuntimeWithFallback(
      translate,
      'result.message.perfect',
      'Idealny wynik! Jestes gwiazda matematyki.'
    );
  }

  if (percent >= 80) {
    return translateKangurCmsRuntimeWithFallback(
      translate,
      'result.message.great',
      'Niesamowita robota! Tak trzymaj.'
    );
  }

  if (percent >= 60) {
    return translateKangurCmsRuntimeWithFallback(
      translate,
      'result.message.good',
      'Dobra robota! Cwiczenie czyni mistrza.'
    );
  }

  return translateKangurCmsRuntimeWithFallback(
    translate,
    'result.message.tryAgain',
    'Probuj dalej. Dasz rade.'
  );
};

export const resolveKangurCmsResultTitle = (
  playerName: string,
  translate?: KangurCmsRuntimeTranslate
): string =>
  translateKangurCmsRuntimeWithFallback(
    translate,
    'result.title',
    'Świetna robota, {playerName}!',
    {
      playerName: resolveKangurCmsPlayerName(playerName, translate),
    }
  );

export const resolveKangurCmsGreetingLabel = (
  playerName: string,
  translate?: KangurCmsRuntimeTranslate
): string =>
  translateKangurCmsRuntimeWithFallback(
    translate,
    'operationSelector.greetingLabel',
    'Czesc, {playerName}! 👋',
    {
      playerName: resolveKangurCmsPlayerName(playerName, translate),
    }
  );

export const resolveKangurCmsAssignmentPriorityLabel = (
  priority: 'high' | 'medium' | 'low',
  translate?: KangurCmsRuntimeTranslate
): string => {
  if (priority === 'high') {
    return translateKangurCmsRuntimeWithFallback(
      translate,
      'assignments.priority.high',
      'Priorytet wysoki'
    );
  }

  if (priority === 'medium') {
    return translateKangurCmsRuntimeWithFallback(
      translate,
      'assignments.priority.medium',
      'Priorytet sredni'
    );
  }

  return translateKangurCmsRuntimeWithFallback(
    translate,
    'assignments.priority.low',
    'Priorytet niski'
  );
};

export const resolveKangurCmsPracticeAssignmentHelperLabel = (
  screen: KangurGameScreen,
  operationLabel: string,
  translate?: KangurCmsRuntimeTranslate
): string => {
  if (screen === 'training' || screen === 'playing') {
    return translateKangurCmsRuntimeWithFallback(
      translate,
      'assignments.helper.activeSession',
      'W tej sesji realizujesz przydzielone zadanie.'
    );
  }

  return translateKangurCmsRuntimeWithFallback(
    translate,
    'assignments.helper.nextPractice',
    'Najblizszy priorytet w praktyce: {operation}.',
    {
      operation: operationLabel,
    }
  );
};

export const formatKangurCmsAssignmentCountLabel = (
  count: number,
  translate?: KangurCmsRuntimeTranslate
): string =>
  translateKangurCmsRuntimeWithFallback(
    translate,
    'assignments.countLabel',
    '{count} zadan',
    { count }
  );

export const formatKangurCmsResultStarsLabel = (
  stars: number,
  translate?: KangurCmsRuntimeTranslate
): string =>
  translateKangurCmsRuntimeWithFallback(
    translate,
    'result.starsLabel',
    '{stars} / 3 gwiazdki',
    { stars }
  );

export const formatKangurCmsTimeTakenLabel = (
  seconds: number,
  translate?: KangurCmsRuntimeTranslate
): string =>
  translateKangurCmsRuntimeWithFallback(
    translate,
    'result.timeTakenLabel',
    '{seconds}s',
    { seconds }
  );
