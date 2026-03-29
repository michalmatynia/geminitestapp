import type { KangurQuestionChoice } from '@kangur/contracts';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurResultsHref } from '../scores/resultsHref';
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
  formatCompetitionModeTitle,
  formatQuestionProgress,
  getCompetitionChoiceDescription,
  getCompetitionQuestionPointValue,
} from './competition-utils';
import type { KangurMobileCompetitionModeItem } from './useKangurMobileCompetition';

const PLAN_ROUTE = createKangurPlanHref();
const RESULTS_ROUTE = createKangurResultsHref();

export function KangurMobileCompetitionPlayer({
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
