import type { KangurQuestionChoice } from '@kangur/contracts/kangur';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { useKangurMobileI18n, type KangurMobileLocale } from '../i18n/kangurMobileI18n';
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

type CompetitionSummaryProps = {
  copy: (dict: { de: string; en: string; pl: string }) => string;
  locale: KangurMobileLocale;
  item: KangurMobileCompetitionModeItem;
  results: { correct: number; percent: number; earned: number; total: number };
  onRestart: () => void;
  onBackToCatalog: () => void;
};

const CompetitionSummary = ({
  copy,
  locale,
  item,
  results,
  onRestart,
  onBackToCatalog,
}: CompetitionSummaryProps): JSX.Element => (
  <>
    <KangurMobileAiTutorCard
      context={{
        contentId: 'game:result:kangur',
        focusKind: 'summary',
        masterySummary: {
          de: `${results.earned}/${results.total} Punkte`,
          en: `${results.earned}/${results.total} points`,
          pl: `${results.earned}/${results.total} punktów`,
        }[locale],
        surface: 'game',
        title: formatCompetitionModeTitle(item.mode, locale),
      }}
      gameTarget='competition'
    />
    <SectionCard title={copy({ de: 'Wettbewerbszusammenfassung', en: 'Competition summary', pl: 'Podsumowanie konkursu' })}>
      <StatusPill
        label={{
          de: `${results.correct}/${item.questions.length} richtig · ${results.percent}%`,
          en: `${results.correct}/${item.questions.length} correct · ${results.percent}%`,
          pl: `${results.correct}/${item.questions.length} poprawnych · ${results.percent}%`,
        }[locale]}
        tone={results.percent >= 70 ? SUCCESS_TONE : WARNING_TONE}
      />
      <StatusPill label={{ de: `${results.earned}/${results.total} Punkte`, en: `${results.earned}/${results.total} points`, pl: `${results.earned}/${results.total} punktów` }[locale]} tone={INDIGO_TONE} />
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({ de: 'Wiederhole die Runde, kehre zur Auswahl zurück oder gehe direkt weiter zu Ergebnissen und Tagesplan.', en: 'Repeat this round, go back to the competition setup, or continue to results and the daily plan.', pl: 'Powtórz rundę, wróć do wyboru konkursu albo przejdź dalej do wyników i planu dnia.' })}
      </Text>
      <View style={{ flexDirection: 'column', gap: 10 }}>
        <PrimaryButton label={copy({ de: 'Runde wiederholen', en: 'Restart this round', pl: 'Powtórz rundę' })} onPress={onRestart} />
        <PrimaryButton label={copy({ de: 'Zurück do Auswahl', en: 'Back to setup', pl: 'Wróć do wyboru' })} onPress={onBackToCatalog} tone={BASE_TONE} />
        <OutlineLink href={RESULTS_ROUTE} hint={copy({ de: 'Öffnet die Ergebnisse.', en: 'Opens results.', pl: 'Otwiera wyniki.' })} label={copy({ de: 'Ergebnisse öffnen', en: 'Open results', pl: 'Otwórz wyniki' })} />
        <OutlineLink href={PLAN_ROUTE} hint={copy({ de: 'Öffnet den Tagesplan.', en: 'Opens the daily plan.', pl: 'Otwiera plan dnia.' })} label={copy({ de: 'Zum Tagesplan', en: 'Go to daily plan', pl: 'Przejdź do planu dnia' })} />
      </View>
    </SectionCard>
  </>
);

type QuestionViewProps = {
  copy: (dict: { de: string; en: string; pl: string }) => string;
  locale: KangurMobileLocale;
  item: KangurMobileCompetitionModeItem;
  currentIndex: number;
  currentQuestion: KangurMobileCompetitionModeItem['questions'][number];
  selectedChoice: KangurQuestionChoice | undefined;
  onSetAnswers: React.Dispatch<React.SetStateAction<Record<string, KangurQuestionChoice | undefined>>>;
  onSetCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  onSetFinished: React.Dispatch<React.SetStateAction<boolean>>;
};

const QuestionView = ({ copy, locale, item, currentIndex, currentQuestion, selectedChoice, onSetAnswers, onSetCurrentIndex, onSetFinished }: QuestionViewProps): JSX.Element => (
  <>
    <KangurMobileAiTutorCard
      context={{
        contentId: `game:kangur:session:${item.mode}`,
        currentQuestion: currentQuestion.question,
        focusKind: 'screen',
        questionId: currentQuestion.id,
        questionProgressLabel: formatQuestionProgress(currentIndex + 1, item.questions.length, locale),
        selectedChoiceText: selectedChoice !== undefined ? String(selectedChoice) : undefined,
        surface: 'game',
        title: formatCompetitionModeTitle(item.mode, locale),
      }}
      gameTarget='competition'
    />
    <SectionCard title={formatQuestionProgress(currentIndex + 1, item.questions.length, locale)}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <StatusPill label={`${getCompetitionQuestionPointValue(currentQuestion)} ${copy({ de: 'Punkte', en: 'points', pl: 'punkty' })}`} tone={WARNING_TONE} />
        {currentQuestion.image !== null && <StatusPill label={copy({ de: 'Mit Illustration', en: 'Illustration included', pl: 'Z ilustracją' })} tone={BASE_TONE} />}
      </View>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700', lineHeight: 24 }}>{currentQuestion.question}</Text>
      <View style={{ flexDirection: 'column', gap: 10 }}>
        {currentQuestion.choices.map((choice, idx) => (
          <ChoiceButton index={idx} isSelected={selectedChoice === choice} key={`${currentQuestion.id}-${String(choice)}`} label={getCompetitionChoiceDescription(currentQuestion, idx)} onPress={() => onSetAnswers(p => ({ ...p, [currentQuestion.id]: choice }))} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton disabled={currentIndex === 0} label={copy({ de: 'Vorherige', en: 'Previous', pl: 'Poprzednie' })} onPress={() => onSetCurrentIndex(p => Math.max(0, p - 1))} tone={BASE_TONE} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={currentIndex === item.questions.length - 1 ? copy({ de: 'Runde beenden', en: 'Finish the round', pl: 'Zakończ rundę' }) : copy({ de: 'Nächste', en: 'Next question', pl: 'Następne pytanie' })}
            onPress={() => { if (currentIndex < item.questions.length - 1) onSetCurrentIndex(p => p + 1); else onSetFinished(true); }}
            tone={SUCCESS_TONE}
          />
        </View>
      </View>
    </SectionCard>
  </>
);

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

  const correctAnswers = useMemo(() => item.questions.filter(q => answers[q.id] === q.answer).length, [answers, item.questions]);
  const earnedPoints = useMemo(() => item.questions.reduce((total, q) => answers[q.id] === q.answer ? total + getCompetitionQuestionPointValue(q) : total, 0), [answers, item.questions]);
  const totalPoints = useMemo(() => item.questions.reduce((total, q) => total + getCompetitionQuestionPointValue(q), 0), [item.questions]);
  const accuracyPercent = item.questions.length > 0 ? Math.round((correctAnswers / item.questions.length) * 100) : 0;

  if (finished) {
    return (
      <CompetitionSummary
        copy={copy}
        item={item}
        locale={locale}
        onBackToCatalog={onBackToCatalog}
        onRestart={() => { setAnswers({}); setCurrentIndex(0); setFinished(false); }}
        results={{ correct: correctAnswers, earned: earnedPoints, percent: accuracyPercent, total: totalPoints }}
      />
    );
  }

  const currentQuestion = item.questions[currentIndex] ?? null;
  if (currentQuestion === null) {
    return (
      <SectionCard title={copy({ de: 'Wettbewerb wird vorbereitet', en: 'Preparing the competition', pl: 'Przygotowujemy konkurs' })}>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({ de: 'Ta runda hat derzeit keine Fragen.', en: 'This round does not have any questions yet.', pl: 'Ta runda nie ma teraz żadnych pytań.' })}
        </Text>
      </SectionCard>
    );
  }

  return (
    <QuestionView
      copy={copy}
      currentIndex={currentIndex}
      currentQuestion={currentQuestion}
      item={item}
      locale={locale}
      onSetAnswers={setAnswers}
      onSetCurrentIndex={setCurrentIndex}
      onSetFinished={setFinished}
      selectedChoice={answers[currentQuestion.id]}
    />
  );
}
