import React from 'react';
import { Text, View } from 'react-native';
import {
  DeferredHomeHeroDetails,
  DeferredHomeHeroIntro,
} from '../home-screen-deferred';
import { OutlineLink } from '../homeScreenPrimitives';
import { PLAN_ROUTE } from '../home-screen-constants';
import { type useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { type Href } from 'expo-router';

type HomeHeroSectionProps = {
  areDeferredHomeHeroIntroReady: boolean;
  areDeferredHomeHeroDetailsReady: boolean;
  homeHeroLearnerName: string | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  recentResultsCount: number;
  homeHeroRecentResult: { correct_answers: number; total_questions: number } | null;
  homeHeroRecentCheckpoint: { title: string; lessonHref: string } | null;
  homeHeroRecentCheckpointCount: number;
  homeHeroFocusHref: Href;
  homeHeroFocusLabel: string;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
};

export function HomeHeroSection({
  areDeferredHomeHeroIntroReady,
  areDeferredHomeHeroDetailsReady,
  homeHeroLearnerName,
  isLoadingAuth,
  isAuthenticated,
  recentResultsCount,
  homeHeroRecentResult,
  homeHeroRecentCheckpoint,
  homeHeroRecentCheckpointCount,
  homeHeroFocusHref,
  homeHeroFocusLabel,
  copy,
}: HomeHeroSectionProps): React.JSX.Element {
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;

  let intro: React.JSX.Element;
  if (!areDeferredHomeHeroIntroReady) {
    intro = (
      <DeferredHomeHeroIntro
        homeHeroLearnerName={homeHeroLearnerName}
        isRestoringAuth={isRestoringAuth}
      />
    );
  } else {
    let introText = '';
    if (isRestoringAuth) {
      introText = copy({
        de: 'Wir stellen gerade die Anmeldung, letzte Ergebnisse und Trainingshinweise wieder her.',
        en: 'We are restoring sign-in, recent results, and training cues.',
        pl: 'Przywracamy teraz logowanie, ostatnie wyniki i wskazówki treningowe.',
      });
    } else if (isAuthenticated && homeHeroLearnerName !== null && homeHeroLearnerName !== '') {
      introText = copy({
        de: `Willkommen, ${homeHeroLearnerName}. Starte mit dem Trainingsfokus, kehre zur letzten Lektion zurück oder öffne direkt den Tagesplan.`,
        en: `Welcome back, ${homeHeroLearnerName}. Start with the training focus, return to the latest lesson, or jump straight into the daily plan.`,
        pl: `Witaj ponownie, ${homeHeroLearnerName}. Zacznij od fokusu treningowego, wróć do ostatniej lekcji albo od razu otwórz plan dnia.`,
      });
    } else {
      introText = copy({
        de: 'Von hier aus kannst du Lektionen, Training, Ergebnisse und Duelle durchsuchen. Nach der Anmeldung siehst du hier auch Ergebnisse und den Tagesplan.',
        en: 'From here you can browse lessons, practice, results, and duels. After sign-in, you will also see results and the daily plan here.',
        pl: 'Stąd możesz przeglądać lekcje, trening, wyniki i pojedynki. Po zalogowaniu zobaczysz tu też wyniki oraz plan dnia.',
      });
    }
    intro = (
      <Text style={{ color: '#475569', fontSize: 16, lineHeight: 24 }}>
        {introText}
      </Text>
    );
  }

  let details: React.JSX.Element | null = null;
  if (!areDeferredHomeHeroDetailsReady) {
    details = <DeferredHomeHeroDetails />;
  } else {
    details = (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#c7d2fe',
            backgroundColor: '#eef2ff',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
            {copy({
              de: `Ergebnisse ${recentResultsCount}`,
              en: `Results ${recentResultsCount}`,
              pl: `Wyniki ${recentResultsCount}`,
            })}
          </Text>
        </View>
        {homeHeroRecentResult !== null ? (
          <View
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#a7f3d0',
              backgroundColor: '#ecfdf5',
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ color: '#047857', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: `Letztes Ergebnis ${homeHeroRecentResult.correct_answers}/${homeHeroRecentResult.total_questions}`,
                en: `Latest score ${homeHeroRecentResult.correct_answers}/${homeHeroRecentResult.total_questions}`,
                pl: `Ostatni wynik ${homeHeroRecentResult.correct_answers}/${homeHeroRecentResult.total_questions}`,
              })}
            </Text>
          </View>
        ) : null}
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#fde68a',
            backgroundColor: '#fffbeb',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '700' }}>
            {homeHeroRecentCheckpoint !== null
              ? copy({
                  de: `Letzte Lektion ${homeHeroRecentCheckpoint.title}`,
                  en: `Latest lesson ${homeHeroRecentCheckpoint.title}`,
                  pl: `Ostatnia lekcja ${homeHeroRecentCheckpoint.title}`,
                })
              : copy({
                  de: `Checkpoints ${homeHeroRecentCheckpointCount}`,
                  en: `Checkpoints ${homeHeroRecentCheckpointCount}`,
                  pl: `Checkpointy ${homeHeroRecentCheckpointCount}`,
                })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text
        accessibilityRole='header'
        style={{ color: '#0f172a', fontSize: 32, fontWeight: '800' }}
      >
        {copy({
          de: 'Kangur mobil',
          en: 'Kangur mobile',
          pl: 'Kangur mobilnie',
        })}
      </Text>
      {intro}
      {details}
      <View style={{ gap: 10 }}>
        <OutlineLink
          href={homeHeroFocusHref}
          label={copy({
            de: `Trainingsfokus: ${homeHeroFocusLabel}`,
            en: `Training focus: ${homeHeroFocusLabel}`,
            pl: `Fokus treningowy: ${homeHeroFocusLabel}`,
          })}
        />
        {areDeferredHomeHeroDetailsReady && homeHeroRecentCheckpoint !== null ? (
          <OutlineLink
            href={homeHeroRecentCheckpoint.lessonHref}
            label={copy({
              de: `Letzte Lektion: ${homeHeroRecentCheckpoint.title}`,
              en: `Latest lesson: ${homeHeroRecentCheckpoint.title}`,
              pl: `Ostatnia lekcja: ${homeHeroRecentCheckpoint.title}`,
            })}
          />
        ) : null}
        {areDeferredHomeHeroDetailsReady ? (
          <OutlineLink
            href={PLAN_ROUTE}
            label={copy({
              de: 'Tagesplan jetzt',
              en: 'Daily plan now',
              pl: 'Plan dnia teraz',
            })}
          />
        ) : null}
      </View>
    </View>
  );
}
