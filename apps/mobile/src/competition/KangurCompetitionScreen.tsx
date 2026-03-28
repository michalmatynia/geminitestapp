import type { KangurExamQuestion, KangurQuestionChoice } from '@kangur/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { useKangurMobileI18n, type KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { createKangurLessonsCatalogHref } from '../lessons/lessonHref';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import { KangurMobileScrollScreen } from '../shared/KangurMobileUi';
import { createKangurTestsHref } from '../tests/testsHref';
import { createKangurCompetitionHref } from './competitionHref';
import {
  BASE_TONE,
  ChoiceButton,
  INDIGO_TONE,
  OutlineLink,
  PrimaryButton,
  SectionCard,
  StatusPill,
  SUCCESS_TONE,
  WARNING_TONE,
} from './competition-primitives';
import {
  useKangurMobileCompetition,
  type KangurMobileCompetitionMode,
  type KangurMobileCompetitionModeItem,
} from './useKangurMobileCompetition';

const COMPETITION_ROUTE = createKangurCompetitionHref();
const TESTS_ROUTE = createKangurTestsHref();
const LESSONS_ROUTE = createKangurLessonsCatalogHref();
const PRACTICE_ROUTE = createKangurPracticeHref('mixed');
const PLAN_ROUTE = createKangurPlanHref();
const RESULTS_ROUTE = createKangurResultsHref();


const formatQuestionCount = (
  count: number,
  locale: KangurMobileLocale,
): string => {
  if (locale === 'de') {
    return count === 1 ? '1 Frage' : `${count} Fragen`;
  }

  if (locale === 'en') {
    return count === 1 ? '1 question' : `${count} questions`;
  }

  if (count === 1) {
    return '1 pytanie';
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return `${count} pytania`;
  }

  return `${count} pytań`;
};

const formatQuestionProgress = (
  current: number,
  total: number,
  locale: KangurMobileLocale,
): string =>
  ({
    de: `Frage ${current} von ${total}`,
    en: `Question ${current} of ${total}`,
    pl: `Pytanie ${current} z ${total}`,
  })[locale];

const formatCompetitionModeTitle = (
  mode: KangurMobileCompetitionMode,
  locale: KangurMobileLocale,
): string => {
  if (mode === 'full_test_2024') {
    return {
      de: 'Kangur 2024 · Voller Wettbewerb',
      en: 'Kangaroo 2024 · Full competition',
      pl: 'Kangur 2024 · Pełny konkurs',
    }[locale];
  }

  if (mode === 'original_4pt_2024') {
    return {
      de: 'Kangur 2024 · 4-Punkte-Teil',
      en: 'Kangaroo 2024 · 4-point round',
      pl: 'Kangur 2024 · Część za 4 pkt',
    }[locale];
  }

  if (mode === 'original_5pt_2024') {
    return {
      de: 'Kangur 2024 · 5-Punkte-Teil',
      en: 'Kangaroo 2024 · 5-point round',
      pl: 'Kangur 2024 · Część za 5 pkt',
    }[locale];
  }

  return {
    de: 'Kangur 2024 · 3-Punkte-Teil',
    en: 'Kangaroo 2024 · 3-point round',
    pl: 'Kangur 2024 · Część za 3 pkt',
  }[locale];
};

const formatCompetitionModeDescription = (
  mode: KangurMobileCompetitionMode,
  locale: KangurMobileLocale,
): string => {
  if (mode === 'full_test_2024') {
    return {
      de: 'Der komplette Wettbewerbstest 2024 mit dem vollen Satz der Aufgaben.',
      en: 'The full 2024 competition session with the complete set of tasks.',
      pl: 'Pełna sesja konkursowa z 2024 roku z całym zestawem zadań.',
    }[locale];
  }

  if (mode === 'original_4pt_2024') {
    return {
      de: 'Mittlere Wettbewerbsrunde z 2024 roku z zadaniami za 4 punkty.',
      en: 'The mid competition round from 2024 with the 4-point tasks.',
      pl: 'Środkowa runda konkursu z 2024 roku z zadaniami za 4 punkty.',
    }[locale];
  }

  if (mode === 'original_5pt_2024') {
    return {
      de: 'Trudniejsza runda konkursu z 2024 roku z zadaniami za 5 punktów.',
      en: 'The harder 2024 competition round with the 5-point tasks.',
      pl: 'Trudniejsza runda konkursu z 2024 roku z zadaniami za 5 punktów.',
    }[locale];
  }

  return {
    de: 'Startowa runda konkursu z 2024 roku z zadaniami za 3 punkty.',
    en: 'The starter 2024 competition round with the 3-point tasks.',
    pl: 'Startowa runda konkursu z 2024 roku z zadaniami za 3 punkty.',
  }[locale];
};

const formatCompetitionTierLabel = (
  pointTier: KangurMobileCompetitionModeItem['pointTier'],
  locale: KangurMobileLocale,
): string => {
  if (pointTier === 'mixed') {
    return {
      de: '3-5 Punkte',
      en: '3-5 points',
      pl: '3-5 punktów',
    }[locale];
  }

  return {
    de: `${pointTier} Punkte`,
    en: `${pointTier} points`,
    pl: `${pointTier} punkty`,
  }[locale];
};

const formatModeToken = (value: string): string =>
  value.replace(/[-_]+/g, ' ').trim();

const getCompetitionQuestionPointValue = (question: Pick<KangurExamQuestion, 'id'>): number => {
  if (question.id.includes('_5pt_')) {
    return 5;
  }
  if (question.id.includes('_4pt_')) {
    return 4;
  }
  return 3;
};

const getCompetitionChoiceDescription = (
  question: KangurExamQuestion,
  index: number,
): string => {
  const describedChoice = question.choiceDescriptions?.[index]?.trim();
  if (describedChoice) {
    return describedChoice;
  }

  const choice = question.choices[index];
  if (typeof choice === 'number') {
    return String(choice);
  }

  return choice ?? '';
};

function KangurMobileCompetitionPlayer({
  item,
  onBackToCatalog,
}: {
  item: KangurMobileCompetitionModeItem;
  onBackToCatalog: () => void;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const [answers, setAnswers] = useState<Record<string, KangurQuestionChoice | undefined>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const currentQuestion = item.questions[currentIndex] ?? null;
  const selectedChoice = currentQuestion ? answers[currentQuestion.id] : undefined;
  const correctAnswers = useMemo(
    () =>
      item.questions.reduce((total, question) => {
        if (answers[question.id] === question.answer) {
          return total + 1;
        }
        return total;
      }, 0),
    [answers, item.questions],
  );
  const earnedPoints = useMemo(
    () =>
      item.questions.reduce((total, question) => {
        if (answers[question.id] === question.answer) {
          return total + getCompetitionQuestionPointValue(question);
        }
        return total;
      }, 0),
    [answers, item.questions],
  );
  const totalPoints = useMemo(
    () =>
      item.questions.reduce(
        (total, question) => total + getCompetitionQuestionPointValue(question),
        0,
      ),
    [item.questions],
  );
  const accuracyPercent =
    item.questions.length > 0
      ? Math.round((correctAnswers / item.questions.length) * 100)
      : 0;

  const handleRestart = (): void => {
    setAnswers({});
    setCurrentIndex(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <>
        <KangurMobileAiTutorCard
          context={{
            contentId: 'game:result:kangur',
            focusKind: 'summary',
            masterySummary: {
              de: `${earnedPoints}/${totalPoints} Punkte`,
              en: `${earnedPoints}/${totalPoints} points`,
              pl: `${earnedPoints}/${totalPoints} punktów`,
            }[locale],
            surface: 'game',
            title: formatCompetitionModeTitle(item.mode, locale),
          }}
          gameTarget='competition'
        />
        <SectionCard
          title={copy({
            de: 'Wettbewerbszusammenfassung',
            en: 'Competition summary',
            pl: 'Podsumowanie konkursu',
          })}
        >
          <StatusPill
            label={
              {
                de: `${correctAnswers}/${item.questions.length} richtig · ${accuracyPercent}%`,
                en: `${correctAnswers}/${item.questions.length} correct · ${accuracyPercent}%`,
                pl: `${correctAnswers}/${item.questions.length} poprawnych · ${accuracyPercent}%`,
              }[locale]
            }
            tone={accuracyPercent >= 70 ? SUCCESS_TONE : WARNING_TONE}
          />
          <StatusPill
            label={
              {
                de: `${earnedPoints}/${totalPoints} Punkte`,
                en: `${earnedPoints}/${totalPoints} points`,
                pl: `${earnedPoints}/${totalPoints} punktów`,
              }[locale]
            }
            tone={INDIGO_TONE}
          />
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Wiederhole die Runde, kehre zur Auswahl zurück oder gehe direkt weiter zu Ergebnissen und Tagesplan.',
              en: 'Repeat this round, go back to the competition setup, or continue to results and the daily plan.',
              pl: 'Powtórz rundę, wróć do wyboru konkursu albo przejdź dalej do wyników i planu dnia.',
            })}
          </Text>
          <View style={{ flexDirection: 'column', gap: 10 }}>
            <PrimaryButton
              label={copy({
                de: 'Runde wiederholen',
                en: 'Restart this round',
                pl: 'Powtórz rundę',
              })}
              onPress={handleRestart}
            />
            <PrimaryButton
              label={copy({
                de: 'Zurück do Auswahl',
                en: 'Back to setup',
                pl: 'Wróć do wyboru',
              })}
              onPress={onBackToCatalog}
              tone={BASE_TONE}
            />
            <OutlineLink
              href={RESULTS_ROUTE}
              hint={copy({
                de: 'Öffnet die Ergebnisse.',
                en: 'Opens results.',
                pl: 'Otwiera wyniki.',
              })}
              label={copy({
                de: 'Ergebnisse öffnen',
                en: 'Open results',
                pl: 'Otwórz wyniki',
              })}
            />
            <OutlineLink
              href={PLAN_ROUTE}
              hint={copy({
                de: 'Öffnet den Tagesplan.',
                en: 'Opens the daily plan.',
                pl: 'Otwiera plan dnia.',
              })}
              label={copy({
                de: 'Zum Tagesplan',
                en: 'Go to daily plan',
                pl: 'Przejdź do planu dnia',
              })}
            />
          </View>
        </SectionCard>
      </>
    );
  }

  if (!currentQuestion) {
    return (
      <>
        <KangurMobileAiTutorCard
          context={{
            contentId: 'game:kangur:session',
            focusId: 'kangur-game-kangur-session',
            focusKind: 'screen',
            surface: 'game',
            title: formatCompetitionModeTitle(item.mode, locale),
          }}
          gameTarget='competition'
        />
        <SectionCard
          title={copy({
            de: 'Wettbewerb wird vorbereitet',
            en: 'Preparing the competition',
            pl: 'Przygotowujemy konkurs',
          })}
        >
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Ta runda hat derzeit keine Fragen.',
              en: 'This round does not have any questions yet.',
              pl: 'Ta runda nie ma teraz żadnych pytań.',
            })}
          </Text>
        </SectionCard>
      </>
    );
  }

  return (
    <>
      <KangurMobileAiTutorCard
        context={{
          contentId: `game:kangur:session:${item.mode}`,
          currentQuestion: currentQuestion.question,
          focusId: 'kangur-game-kangur-session',
          focusKind: 'screen',
          focusLabel: currentQuestion.question,
          questionId: currentQuestion.id,
          questionProgressLabel: formatQuestionProgress(
            currentIndex + 1,
            item.questions.length,
            locale,
          ),
          selectedChoiceText:
            selectedChoice !== undefined ? String(selectedChoice) : undefined,
          surface: 'game',
          title: formatCompetitionModeTitle(item.mode, locale),
        }}
        gameTarget='competition'
      />
      <SectionCard
        title={formatQuestionProgress(currentIndex + 1, item.questions.length, locale)}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <StatusPill
            label={
              {
                de: `${getCompetitionQuestionPointValue(currentQuestion)} Punkte`,
                en: `${getCompetitionQuestionPointValue(currentQuestion)} points`,
                pl: `${getCompetitionQuestionPointValue(currentQuestion)} punkty`,
              }[locale]
            }
            tone={WARNING_TONE}
          />
          {currentQuestion.image ? (
            <StatusPill
              label={copy({
                de: 'Mit Illustration',
                en: 'Illustration included',
                pl: 'Z ilustracją',
              })}
              tone={BASE_TONE}
            />
          ) : null}
        </View>
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700', lineHeight: 24 }}>
          {currentQuestion.question}
        </Text>
        {currentQuestion.image ? (
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({
              de: 'Diese Aufgabe nutzt eine Illustration. Hier bleibt die beschreibende Version aktiv.',
              en: 'This task uses an illustration. The descriptive version stays active here.',
              pl: 'To zadanie korzysta z ilustracji. Tutaj zostaje aktywna wersja opisowa.',
            })}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'column', gap: 10 }}>
          {currentQuestion.choices.map((choice, index) => (
            <ChoiceButton
              index={index}
              isSelected={selectedChoice === choice}
              key={`${currentQuestion.id}-${String(choice)}-${index}`}
              label={getCompetitionChoiceDescription(currentQuestion, index)}
              onPress={() => {
                setAnswers((previous) => ({
                  ...previous,
                  [currentQuestion.id]: choice,
                }));
              }}
            />
          ))}
        </View>
        {!selectedChoice ? (
          <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
            {copy({
              de: 'Du kannst diese Frage überspringen und später zurückkommen.',
              en: 'You can skip this question now and come back later.',
              pl: 'Możesz pominąć to pytanie i wrócić do niego później.',
            })}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              disabled={currentIndex === 0}
              label={copy({
                de: 'Vorherige',
                en: 'Previous',
                pl: 'Poprzednie',
              })}
              onPress={() => {
                setCurrentIndex((previous) => Math.max(0, previous - 1));
              }}
              tone={BASE_TONE}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={
                currentIndex === item.questions.length - 1
                  ? copy({
                      de: 'Runde beenden',
                      en: 'Finish the round',
                      pl: 'Zakończ rundę',
                    })
                  : copy({
                      de: 'Nächste',
                      en: 'Next question',
                      pl: 'Następne pytanie',
                    })
              }
              onPress={() => {
                if (currentIndex < item.questions.length - 1) {
                  setCurrentIndex((previous) => previous + 1);
                  return;
                }

                setFinished(true);
              }}
              tone={SUCCESS_TONE}
            />
          </View>
        </View>
      </SectionCard>
    </>
  );
}

export function KangurCompetitionScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const router = useRouter();
  const { copy, locale } = useKangurMobileI18n();
  const rawModeParam = Array.isArray(params.mode) ? params.mode[0] ?? null : params.mode ?? null;
  const { focusedMode, modeToken, modes } = useKangurMobileCompetition(rawModeParam);
  const [activeMode, setActiveMode] = useState<KangurMobileCompetitionMode | null>(null);

  useEffect(() => {
    if (focusedMode) {
      setActiveMode(focusedMode);
    }
  }, [focusedMode]);

  useEffect(() => {
    if (!activeMode) {
      return;
    }

    const stillExists = modes.some((item) => item.mode === activeMode);
    if (!stillExists) {
      setActiveMode(null);
    }
  }, [activeMode, modes]);

  const activeItem = modes.find((item) => item.mode === activeMode) ?? null;
  const missingFocusedMode =
    modeToken !== null && focusedMode === null && activeItem === null;
  const setupTutorContext = {
    contentId: 'game:kangur:setup',
    focusId: 'kangur-game-kangur-setup',
    focusKind: 'screen' as const,
    surface: 'game' as const,
    title: copy({
      de: 'Kangur-Wettbewerb',
      en: 'Kangaroo competition',
      pl: 'Konkurs Kangur',
    }),
  };

  return (
    <KangurMobileScrollScreen
      backgroundColor='#f8fafc'
      contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}
      edges={['top', 'left', 'right']}
      keyboardShouldPersistTaps='handled'
    >
        <SectionCard
          title={copy({
            de: 'Kangur-Wettbewerb',
            en: 'Kangaroo competition',
            pl: 'Konkurs Kangur',
          })}
        >
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Wähle eine Runde des Wettbewerbs 2024 und löse die Fragen in deinem eigenen Tempo.',
              en: 'Choose a 2024 competition round and solve the tasks at your own pace.',
              pl: 'Wybierz rundę konkursu z 2024 roku i rozwiązuj zadania we własnym tempie.',
            })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <StatusPill
              label={copy({
                de: `Runden ${modes.length}`,
                en: `Rounds ${modes.length}`,
                pl: `Rundy ${modes.length}`,
              })}
              tone={INDIGO_TONE}
            />
            <StatusPill
              label={copy({
                de: `Fragen ${modes.reduce((total, mode) => total + mode.questionCount, 0)}`,
                en: `Questions ${modes.reduce((total, mode) => total + mode.questionCount, 0)}`,
                pl: `Pytania ${modes.reduce((total, mode) => total + mode.questionCount, 0)}`,
              })}
              tone={BASE_TONE}
            />
          </View>
          <View style={{ flexDirection: 'column', gap: 8 }}>
            <OutlineLink
              href={TESTS_ROUTE}
              hint={copy({
                de: 'Öffnet die Tests.',
                en: 'Opens tests.',
                pl: 'Otwiera testy.',
              })}
              label={copy({
                de: 'Zu den Tests',
                en: 'Go to tests',
                pl: 'Przejdź do testów',
              })}
            />
            <OutlineLink
              href={RESULTS_ROUTE}
              hint={copy({
                de: 'Öffnet die Ergebnisse.',
                en: 'Opens results.',
                pl: 'Otwiera wyniki.',
              })}
              label={copy({
                de: 'Ergebnisse öffnen',
                en: 'Open results',
                pl: 'Otwórz wyniki',
              })}
            />
            <OutlineLink
              href={PLAN_ROUTE}
              hint={copy({
                de: 'Öffnet den Tagesplan.',
                en: 'Opens the daily plan.',
                pl: 'Otwiera plan dnia.',
              })}
              label={copy({
                de: 'Zum Tagesplan',
                en: 'Go to daily plan',
                pl: 'Przejdź do planu dnia',
              })}
            />
          </View>
        </SectionCard>

        {!activeItem ? (
          <KangurMobileAiTutorCard
            context={setupTutorContext}
            gameTarget='competition'
          />
        ) : null}

        {missingFocusedMode ? (
          <SectionCard
            title={copy({
              de: 'Wettbewerbskürzel',
              en: 'Competition shortcut',
              pl: 'Skrót konkursu',
            })}
          >
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: `Der Link zu "${formatModeToken(modeToken)}" passt gerade zu keiner Wettbewerbsrunde.`,
                en: `The shortcut for "${formatModeToken(modeToken)}" does not match any competition round right now.`,
                pl: `Skrót do „${formatModeToken(modeToken)}” nie pasuje teraz do żadnej rundy konkursu.`,
              })}
            </Text>
            <PrimaryButton
              label={copy({
                de: 'Vollen Wettbewerb öffnen',
                en: 'Open full competition',
                pl: 'Otwórz pełny konkurs',
              })}
              onPress={() => {
                router.replace(COMPETITION_ROUTE);
              }}
              tone={BASE_TONE}
            />
          </SectionCard>
        ) : null}

        {activeItem ? (
          <>
            <SectionCard title={formatCompetitionModeTitle(activeItem.mode, locale)}>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {formatCompetitionModeDescription(activeItem.mode, locale)}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <StatusPill
                  label={formatQuestionCount(activeItem.questionCount, locale)}
                  tone={SUCCESS_TONE}
                />
                <StatusPill
                  label={formatCompetitionTierLabel(activeItem.pointTier, locale)}
                  tone={WARNING_TONE}
                />
              </View>
              <PrimaryButton
                label={copy({
                  de: 'Zurück zur Auswahl',
                  en: 'Back to setup',
                  pl: 'Wróć do wyboru',
                })}
                onPress={() => {
                  setActiveMode(null);
                }}
                tone={BASE_TONE}
              />
            </SectionCard>
            <KangurMobileCompetitionPlayer
              item={activeItem}
              onBackToCatalog={() => {
                setActiveMode(null);
              }}
            />
          </>
        ) : (
          modes.map((item) => (
            <SectionCard
              key={item.mode}
              title={formatCompetitionModeTitle(item.mode, locale)}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <StatusPill
                  label={formatQuestionCount(item.questionCount, locale)}
                  tone={SUCCESS_TONE}
                />
                <StatusPill
                  label={formatCompetitionTierLabel(item.pointTier, locale)}
                  tone={WARNING_TONE}
                />
              </View>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {formatCompetitionModeDescription(item.mode, locale)}
              </Text>
              <PrimaryButton
                label={copy({
                  de: 'Runde starten',
                  en: 'Start this round',
                  pl: 'Uruchom rundę',
                })}
                onPress={() => {
                  setActiveMode(item.mode);
                }}
              />
            </SectionCard>
          ))
        )}

        <SectionCard
          title={copy({
            de: 'Nächste Schritte',
            en: 'Next steps',
            pl: 'Kolejne kroki',
          })}
        >
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Nach der Wettbewerbsrunde kannst du zu Lektionen, Training oder dem Tagesplan wechseln.',
              en: 'After the competition round, move into lessons, practice, or the daily plan.',
              pl: 'Po rundzie konkursowej możesz przejść do lekcji, treningu albo planu dnia.',
            })}
          </Text>
          <View style={{ flexDirection: 'column', gap: 8 }}>
            <OutlineLink
              href={LESSONS_ROUTE}
              hint={copy({
                de: 'Öffnet die Lektionen.',
                en: 'Opens lessons.',
                pl: 'Otwiera lekcje.',
              })}
              label={copy({
                de: 'Lektionen öffnen',
                en: 'Open lessons',
                pl: 'Otwórz lekcje',
              })}
            />
            <OutlineLink
              href={PRACTICE_ROUTE}
              hint={copy({
                de: 'Öffnet das Training.',
                en: 'Opens practice.',
                pl: 'Otwiera trening.',
              })}
              label={copy({
                de: 'Training öffnen',
                en: 'Open practice',
                pl: 'Otwórz trening',
              })}
            />
          </View>
        </SectionCard>
    </KangurMobileScrollScreen>
  );
}
