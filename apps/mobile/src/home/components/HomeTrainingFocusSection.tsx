import React from 'react';
import { Text, View } from 'react-native';
import {
  SectionCard,
} from '../homeScreenPrimitives';
import {
  DeferredTrainingFocusDetailsPlaceholder,
} from '../home-screen-deferred';
import { FocusCard } from './FocusCard';
import { createKangurLessonHref } from '../../lessons/lessonHref';
import { createKangurPracticeHref } from '../../practice/practiceHref';
import { type HomeScoreViewModel } from '../home-screen-score-state';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

type HomeTrainingFocusSectionProps = {
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeTrainingFocusDetailsReady: boolean;
  trainingFocus: HomeScoreViewModel['trainingFocus'];
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
};

export function HomeTrainingFocusSection({
  areDeferredHomePanelsReady,
  areDeferredHomeTrainingFocusDetailsReady,
  trainingFocus,
  copy,
}: HomeTrainingFocusSectionProps): React.JSX.Element | null {
  if (!areDeferredHomePanelsReady) {
    return null;
  }

  let content: React.JSX.Element;
  if (trainingFocus.isRestoringAuth || trainingFocus.isLoading) {
    content = (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Die Anmeldung und der ergebnisbasierte Trainingsfokus werden wiederhergestellt.',
          en: 'Restoring sign-in and score-based training focus.',
          pl: 'Przywracamy logowanie i fokus treningowy oparty na wynikach.',
        })}
      </Text>
    );
  } else if (!areDeferredHomeTrainingFocusDetailsReady) {
    content = <DeferredTrainingFocusDetailsPlaceholder />;
  } else if (!trainingFocus.isEnabled &&
    trainingFocus.weakestOperation === null &&
    trainingFocus.strongestOperation === null) {
    content = (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten den aktualisierten Trainingsfokus für den nächsten Startschritt vor.',
          en: 'Preparing the refreshed training focus for the next home step.',
          pl: 'Przygotowujemy odświeżony fokus treningowy na kolejny etap ekranu startowego.',
        })}
      </Text>
    );
  } else if (trainingFocus.error !== null && trainingFocus.error !== '') {
    content = (
      <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
        {trainingFocus.error}
      </Text>
    );
  } else {
    content = (
      <View style={{ gap: 12 }}>
        {trainingFocus.weakestOperation !== null ? (
          <FocusCard
            actionHref={createKangurPracticeHref(
              trainingFocus.weakestOperation.operation,
            )}
            actionLabel={copy({
              de: 'Schwächsten Modus trainieren',
              en: 'Practice weakest mode',
              pl: 'Trenuj najsłabszy tryb',
            })}
            averageAccuracyPercent={
              trainingFocus.weakestOperation.averageAccuracyPercent
            }
            lessonHref={createKangurLessonHref(
              trainingFocus.weakestLessonFocus,
            )}
            operation={trainingFocus.weakestOperation.operation}
            sessions={trainingFocus.weakestOperation.sessions}
            title={copy({
              de: 'Zum Wiederholen',
              en: 'Needs review',
              pl: 'Do powtórki',
            })}
          />
        ) : null}

        {trainingFocus.strongestOperation !== null ? (
          <FocusCard
            actionHref={createKangurPracticeHref(
              trainingFocus.strongestOperation.operation,
            )}
            actionLabel={copy({
              de: 'Tempo halten',
              en: 'Keep the momentum',
              pl: 'Utrzymaj tempo',
            })}
            averageAccuracyPercent={
              trainingFocus.strongestOperation.averageAccuracyPercent
            }
            lessonHref={createKangurLessonHref(
              trainingFocus.strongestLessonFocus,
            )}
            operation={trainingFocus.strongestOperation.operation}
            sessions={trainingFocus.strongestOperation.sessions}
            title={copy({
              de: 'Stärkster Modus',
              en: 'Strongest mode',
              pl: 'Najmocniejszy tryb',
            })}
          />
        ) : null}

        {trainingFocus.weakestOperation === null &&
        trainingFocus.strongestOperation === null ? (
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Es gibt noch keine Ergebnisse für diesen Fokus. Starte mit einem Training oder öffne direkt eine Lektion.',
              en: 'There are no results for this focus yet. Start with practice or open a lesson directly.',
              pl: 'Nie ma jeszcze wyników dla tego fokusu. Zacznij od treningu albo otwórz lekcję bezpośrednio.',
            })}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <SectionCard
      title={copy({
        de: 'Trainingsfokus',
        en: 'Training focus',
        pl: 'Fokus treningowy',
      })}
    >
      {content}
    </SectionCard>
  );
}
