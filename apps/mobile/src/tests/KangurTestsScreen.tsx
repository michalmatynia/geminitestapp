import type {
  KangurTestChoice,
} from '@kangur/contracts';
import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';

import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { useKangurMobileI18n, type KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { createKangurLessonsCatalogHref } from '../lessons/lessonHref';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import { createKangurTestsHref } from './testsHref';
import {
  useKangurMobileTests,
  type KangurMobileTestSuiteItem,
} from './useKangurMobileTests';

type Tone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const TESTS_ROUTE = createKangurTestsHref();
const LESSONS_ROUTE = createKangurLessonsCatalogHref();
const PRACTICE_ROUTE = createKangurPracticeHref('mixed');
const PLAN_ROUTE = createKangurPlanHref();
const RESULTS_ROUTE = createKangurResultsHref();

const BASE_TONE: Tone = {
  backgroundColor: '#f8fafc',
  borderColor: '#cbd5e1',
  textColor: '#475569',
};

const SUCCESS_TONE: Tone = {
  backgroundColor: '#ecfdf5',
  borderColor: '#a7f3d0',
  textColor: '#047857',
};

const WARNING_TONE: Tone = {
  backgroundColor: '#fffbeb',
  borderColor: '#fde68a',
  textColor: '#b45309',
};

const ERROR_TONE: Tone = {
  backgroundColor: '#fef2f2',
  borderColor: '#fecaca',
  textColor: '#b91c1c',
};

const INDIGO_TONE: Tone = {
  backgroundColor: '#eef2ff',
  borderColor: '#c7d2fe',
  textColor: '#4338ca',
};

const formatFocusToken = (
  value: string,
): string => value.replace(/[-_]+/g, ' ').trim();

const formatSuiteMeta = (
  suite: KangurMobileTestSuiteItem['suite'],
  locale: KangurMobileLocale,
): string[] => {
  const parts: string[] = [];

  if (typeof suite.year === 'number') {
    parts.push(
      {
        de: `Jahr ${suite.year}`,
        en: `Year ${suite.year}`,
        pl: `Rok ${suite.year}`,
      }[locale],
    );
  }

  if (suite.gradeLevel.trim().length > 0) {
    parts.push(
      {
        de: `Poziom ${suite.gradeLevel}`,
        en: `Level ${suite.gradeLevel}`,
        pl: `Poziom ${suite.gradeLevel}`,
      }[locale],
    );
  }

  if (suite.category.trim().length > 0) {
    parts.push(
      {
        de: `Kategoria ${suite.category}`,
        en: `Category ${suite.category}`,
        pl: `Kategoria ${suite.category}`,
      }[locale],
    );
  }

  return parts;
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

const formatPointsLabel = (
  value: number,
  locale: KangurMobileLocale,
): string =>
  ({
    de: `${value} Pkt`,
    en: `${value} pts`,
    pl: `${value} pkt`,
  })[locale];

const resolveQuestionStatusTone = (
  scorePercent: number,
): Tone => {
  if (scorePercent >= 80) {
    return SUCCESS_TONE;
  }
  if (scorePercent >= 50) {
    return WARNING_TONE;
  }
  return ERROR_TONE;
};

function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        elevation: 3,
        gap: 12,
        padding: 20,
        shadowColor: '#0f172a',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      }}
    >
      <Text
        accessibilityRole='header'
        style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function StatusPill({
  label,
  tone = BASE_TONE,
}: {
  label: string;
  tone?: Tone;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function OutlineLink({
  href,
  hint,
  label,
}: {
  href: Href;
  hint?: string;
  label: string;
}): React.JSX.Element {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityHint={hint}
        accessibilityLabel={label}
        accessibilityRole='button'
        style={{
          alignSelf: 'stretch',
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 999,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 10,
          width: '100%',
        }}
      >
        <Text
          style={{
            color: '#0f172a',
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function PrimaryButton({
  disabled = false,
  hint,
  label,
  onPress,
  tone = INDIGO_TONE,
}: {
  disabled?: boolean;
  hint?: string;
  label: string;
  onPress?: () => void;
  tone?: Tone;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole='button'
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: disabled ? '#e2e8f0' : tone.backgroundColor,
        borderColor: disabled ? '#cbd5e1' : tone.borderColor,
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 44,
        opacity: disabled ? 0.7 : 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: disabled ? '#64748b' : tone.textColor,
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ChoiceButton({
  choice,
  disabled = false,
  isCorrect,
  isRevealed,
  isSelected,
  label,
  locale,
  onPress,
}: {
  choice: KangurTestChoice;
  disabled?: boolean;
  isCorrect: boolean;
  isRevealed: boolean;
  isSelected: boolean;
  label: string;
  locale: KangurMobileLocale;
  onPress: () => void;
}): React.JSX.Element {
  const tone = isRevealed
    ? isCorrect
      ? SUCCESS_TONE
      : isSelected
        ? ERROR_TONE
        : BASE_TONE
    : isSelected
      ? INDIGO_TONE
      : BASE_TONE;

  return (
    <Pressable
      accessibilityRole='button'
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
        opacity: disabled ? 0.8 : 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderColor: tone.borderColor,
            borderRadius: 999,
            borderWidth: 1,
            height: 28,
            justifyContent: 'center',
            width: 28,
          }}
        >
          <Text style={{ color: '#0f172a', fontWeight: '800' }}>{label}</Text>
        </View>
        <Text
          style={{
            color: '#0f172a',
            flex: 1,
            fontSize: 15,
            fontWeight: '700',
          }}
        >
          {choice.text}
        </Text>
      </View>
      {choice.description ? (
        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
          {choice.description}
        </Text>
      ) : null}
      {choice.svgContent.trim().length > 0 ? (
        <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 16 }}>
          {
            {
              de: 'Diese Antwort hat zusatzliche Illustrationen.',
              en: 'This answer includes extra illustration content.',
              pl: 'Ta odpowiedź ma dodatkową ilustrację.',
            }[locale]
          }
        </Text>
      ) : null}
    </Pressable>
  );
}

function KangurMobileTestPlayer({
  item,
  onBackToCatalog,
}: {
  item: KangurMobileTestSuiteItem;
  onBackToCatalog: () => void;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>(
    {},
  );

  const currentQuestion = item.questions[currentIndex] ?? null;
  const selectedLabel = currentQuestion ? (answers[currentQuestion.id] ?? null) : null;
  const isAnswered = selectedLabel !== null;
  const showAnswer = currentQuestion ? Boolean(revealedAnswers[currentQuestion.id]) : false;
  const score = useMemo(
    () =>
      item.questions.reduce((total, question) => {
        if (answers[question.id] === question.correctChoiceLabel) {
          return total + question.pointValue;
        }
        return total;
      }, 0),
    [answers, item.questions],
  );
  const maxScore = useMemo(
    () =>
      item.questions.reduce(
        (total, question) => total + question.pointValue,
        0,
      ),
    [item.questions],
  );
  const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const summaryTone = resolveQuestionStatusTone(scorePercent);

  const handleSelect = (label: string): void => {
    if (!currentQuestion || showAnswer) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: label,
    }));
  };

  const handleRevealAnswer = (): void => {
    if (!currentQuestion || !isAnswered || showAnswer) {
      return;
    }

    setRevealedAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: true,
    }));
  };

  const handleNext = (): void => {
    if (currentIndex < item.questions.length - 1) {
      setCurrentIndex((previous) => previous + 1);
      return;
    }

    setFinished(true);
  };

  const handleRestart = (): void => {
    setAnswers({});
    setCurrentIndex(0);
    setFinished(false);
    setRevealedAnswers({});
  };

  if (item.questions.length === 0) {
    return (
      <>
        <KangurMobileAiTutorCard
          context={{
            contentId: item.suite.id,
            focusId: `kangur-test-empty-state:${item.suite.id}`,
            focusKind: 'empty_state',
            surface: 'test',
            title: item.suite.title,
          }}
        />
        <SectionCard
          title={copy({
            de: 'Keine veroffentlichten Fragen',
            en: 'No published questions',
            pl: 'Brak opublikowanych pytań',
          })}
        >
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Dieser Testsatz ist live, aber hat noch keine veroffentlichten Fragen fur Lernende.',
              en: 'This live test suite does not have any published learner questions yet.',
              pl: 'Ten aktywny zestaw nie ma jeszcze opublikowanych pytań dla ucznia.',
            })}
          </Text>
          <PrimaryButton
            label={copy({
              de: 'Zuruck zur Liste',
              en: 'Back to the list',
              pl: 'Wróć do listy',
            })}
            onPress={onBackToCatalog}
            tone={BASE_TONE}
          />
        </SectionCard>
      </>
    );
  }

  if (finished) {
    return (
      <>
        <KangurMobileAiTutorCard
          context={{
            contentId: item.suite.id,
            description: item.suite.description,
            focusId: `kangur-test-summary:${item.suite.id}`,
            focusKind: 'summary',
            masterySummary: {
              de: `${score}/${maxScore} Pkt · ${scorePercent}%`,
              en: `${score}/${maxScore} pts · ${scorePercent}%`,
              pl: `${score}/${maxScore} pkt · ${scorePercent}%`,
            }[locale],
            surface: 'test',
            title: item.suite.title,
          }}
        />
        <SectionCard
          title={copy({
            de: 'Testergebnis',
            en: 'Test summary',
            pl: 'Wynik testu',
          })}
        >
          <StatusPill
            label={
              {
                de: `${score}/${maxScore} Pkt · ${scorePercent}%`,
                en: `${score}/${maxScore} pts · ${scorePercent}%`,
                pl: `${score}/${maxScore} pkt · ${scorePercent}%`,
              }[locale]
            }
            tone={summaryTone}
          />
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>
            {copy({
              de: 'Du hast den ganzen Testsatz abgeschlossen.',
              en: 'You completed the full test suite.',
              pl: 'Ukończyłeś cały zestaw testowy.',
            })}
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Wiederhole den Satz, kehre zur Liste zuruck oder springe direkt in die Ergebnisse und den Tagesplan.',
              en: 'Restart the suite, go back to the catalog, or jump straight into results and the daily plan.',
              pl: 'Powtórz zestaw, wróć do katalogu albo przejdź od razu do wyników i planu dnia.',
            })}
          </Text>
          <View style={{ flexDirection: 'column', gap: 10 }}>
            <PrimaryButton
              label={copy({
                de: 'Test wiederholen',
                en: 'Restart the test',
                pl: 'Powtórz test',
              })}
              onPress={handleRestart}
            />
            <PrimaryButton
              label={copy({
                de: 'Zuruck do Tests',
                en: 'Back to tests',
                pl: 'Wróć do testów',
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
            contentId: item.suite.id,
            focusKind: 'screen',
            surface: 'test',
            title: item.suite.title,
          }}
        />
        <SectionCard
          title={copy({
            de: 'Test wird vorbereitet',
            en: 'Preparing the test',
            pl: 'Przygotowujemy test',
          })}
        >
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Die Fragen werden gerade geladen. Probiere es gleich noch einmal.',
              en: 'Questions are still loading. Try again in a moment.',
              pl: 'Pytania jeszcze się ładują. Spróbuj ponownie za chwilę.',
            })}
          </Text>
        </SectionCard>
      </>
    );
  }

  const selectedChoice =
    selectedLabel
      ? currentQuestion.choices.find((choice) => choice.label === selectedLabel) ?? null
      : null;
  const correctChoice =
    currentQuestion.choices.find(
      (choice) => choice.label === currentQuestion.correctChoiceLabel,
    ) ?? null;
  const tutorContext =
    showAnswer
      ? {
          answerRevealed: true,
          contentId: item.suite.id,
          currentQuestion: currentQuestion.prompt,
          focusId: `kangur-test-question:${currentQuestion.id}`,
          focusKind: 'review' as const,
          focusLabel: currentQuestion.prompt,
          questionId: currentQuestion.id,
          questionProgressLabel: formatQuestionProgress(
            currentIndex + 1,
            item.questions.length,
            locale,
          ),
          selectedChoiceLabel: selectedChoice?.label,
          selectedChoiceText: selectedChoice?.text,
          surface: 'test' as const,
          title: item.suite.title,
        }
      : selectedChoice
        ? {
            answerRevealed: false,
            contentId: item.suite.id,
            currentQuestion: currentQuestion.prompt,
            focusId: `kangur-test-selection:${currentQuestion.id}`,
            focusKind: 'selection' as const,
            focusLabel: selectedChoice.text,
            questionId: currentQuestion.id,
            questionProgressLabel: formatQuestionProgress(
              currentIndex + 1,
              item.questions.length,
              locale,
            ),
            selectedChoiceLabel: selectedChoice.label,
            selectedChoiceText: selectedChoice.text,
            surface: 'test' as const,
            title: item.suite.title,
          }
        : {
            answerRevealed: false,
            contentId: item.suite.id,
            currentQuestion: currentQuestion.prompt,
            focusId: `kangur-test-question:${currentQuestion.id}`,
            focusKind: 'question' as const,
            focusLabel: currentQuestion.prompt,
            questionId: currentQuestion.id,
            questionProgressLabel: formatQuestionProgress(
              currentIndex + 1,
              item.questions.length,
              locale,
            ),
            surface: 'test' as const,
            title: item.suite.title,
          };

  return (
    <>
      <KangurMobileAiTutorCard context={tutorContext} />
      <SectionCard
        title={formatQuestionProgress(currentIndex + 1, item.questions.length, locale)}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <StatusPill
            label={formatPointsLabel(currentQuestion.pointValue, locale)}
            tone={WARNING_TONE}
          />
          <StatusPill
            label={copy({
              de:
                currentQuestion.presentation.choiceStyle === 'grid'
                  ? 'Antwortkarten'
                  : 'Antwortliste',
              en:
                currentQuestion.presentation.choiceStyle === 'grid'
                  ? 'Answer cards'
                  : 'Answer list',
              pl:
                currentQuestion.presentation.choiceStyle === 'grid'
                  ? 'Karty odpowiedzi'
                  : 'Lista odpowiedzi',
            })}
            tone={INDIGO_TONE}
          />
          {currentQuestion.illustration.type !== 'none' ? (
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
          {currentQuestion.prompt}
        </Text>
        {currentQuestion.illustration.type !== 'none' ? (
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({
              de: 'Diese Frage nutzt zusatzliche Bildinhalte. Auf Mobil wird dazu die Textfassung gezeigt.',
              en: 'This question uses extra illustration content. Mobile shows the text-first version here.',
              pl: 'To pytanie korzysta z dodatkowej ilustracji. W mobile pokazujemy tutaj wersję tekstową.',
            })}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'column', gap: 10 }}>
          {currentQuestion.choices.map((choice) => (
            <ChoiceButton
              choice={choice}
              disabled={showAnswer}
              isCorrect={choice.label === currentQuestion.correctChoiceLabel}
              isRevealed={showAnswer}
              isSelected={choice.label === selectedLabel}
              key={choice.label}
              label={choice.label}
              locale={locale}
              onPress={() => handleSelect(choice.label)}
            />
          ))}
        </View>
        {showAnswer ? (
          <View
            style={{
              backgroundColor: '#f8fafc',
              borderColor: '#cbd5e1',
              borderRadius: 20,
              borderWidth: 1,
              gap: 8,
              padding: 16,
            }}
          >
            <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>
              {selectedChoice?.label === currentQuestion.correctChoiceLabel
                ? copy({
                    de: 'Richtige Antwort',
                    en: 'Correct answer',
                    pl: 'Dobra odpowiedź',
                  })
                : copy({
                    de: 'Antwort geprüft',
                    en: 'Answer reviewed',
                    pl: 'Sprawdzona odpowiedź',
                  })}
            </Text>
            {selectedChoice ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {
                  {
                    de: `Gewahlt: ${selectedChoice.label}. ${selectedChoice.text}`,
                    en: `Selected: ${selectedChoice.label}. ${selectedChoice.text}`,
                    pl: `Wybrano: ${selectedChoice.label}. ${selectedChoice.text}`,
                  }[locale]
                }
              </Text>
            ) : null}
            {correctChoice ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {
                  {
                    de: `Richtig: ${correctChoice.label}. ${correctChoice.text}`,
                    en: `Correct: ${correctChoice.label}. ${correctChoice.text}`,
                    pl: `Poprawnie: ${correctChoice.label}. ${correctChoice.text}`,
                  }[locale]
                }
              </Text>
            ) : null}
            {currentQuestion.explanation?.trim() ? (
              <Text style={{ color: '#334155', fontSize: 14, lineHeight: 20 }}>
                {currentQuestion.explanation.trim()}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={{ flexDirection: 'column', gap: 10 }}>
          <PrimaryButton
            disabled={!isAnswered || showAnswer}
            label={copy({
              de: 'Antwort prüfen',
              en: 'Reveal answer',
              pl: 'Sprawdź odpowiedź',
            })}
            onPress={handleRevealAnswer}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                disabled={currentIndex === 0}
                label={copy({
                  de: 'Poprzednie',
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
                disabled={!showAnswer}
                label={
                  currentIndex === item.questions.length - 1
                    ? copy({
                        de: 'Test beenden',
                        en: 'Finish the test',
                        pl: 'Zakończ test',
                      })
                    : copy({
                        de: 'Nächstes',
                        en: 'Next question',
                        pl: 'Następne pytanie',
                      })
                }
                onPress={handleNext}
                tone={SUCCESS_TONE}
              />
            </View>
          </View>
        </View>
      </SectionCard>
    </>
  );
}

export function KangurTestsScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const router = useRouter();
  const { copy, locale } = useKangurMobileI18n();
  const focusParam = Array.isArray(params.focus) ? params.focus[0] ?? null : params.focus ?? null;
  const { error, focusToken, focusedSuiteId, isLoading, refresh, suites } =
    useKangurMobileTests(focusParam ?? null);
  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(null);

  useEffect(() => {
    if (focusedSuiteId) {
      setActiveSuiteId(focusedSuiteId);
    }
  }, [focusedSuiteId]);

  useEffect(() => {
    if (!activeSuiteId) {
      return;
    }

    const stillExists = suites.some((entry) => entry.suite.id === activeSuiteId);
    if (!stillExists) {
      setActiveSuiteId(null);
    }
  }, [activeSuiteId, suites]);

  const activeSuite = suites.find((entry) => entry.suite.id === activeSuiteId) ?? null;
  const missingFocusedSuite =
    focusToken !== null && focusedSuiteId === null && activeSuite === null && !isLoading;
  const catalogTutorContext = {
    contentId: 'test:catalog',
    focusKind: 'screen' as const,
    surface: 'test' as const,
    title: copy({
      de: 'Tests',
      en: 'Tests',
      pl: 'Testy',
    }),
  };

  return (
    <SafeAreaView
      style={{ backgroundColor: '#f8fafc', flex: 1 }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps='handled'
      >
        <SectionCard
          title={copy({
            de: 'Tests',
            en: 'Tests',
            pl: 'Testy',
          })}
        >
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Wahle einen aktiven Testsatz und gehe die Fragen Schritt fur Schritt durch.',
              en: 'Choose a live test suite and work through the questions step by step.',
              pl: 'Wybierz aktywny zestaw testowy i przechodź przez pytania krok po kroku.',
            })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <StatusPill
              label={copy({
                de: `Sätze ${suites.length}`,
                en: `Suites ${suites.length}`,
                pl: `Zestawy ${suites.length}`,
              })}
              tone={INDIGO_TONE}
            />
            <StatusPill
              label={copy({
                de: `Fragen ${suites.reduce((total, suite) => total + suite.questionCount, 0)}`,
                en: `Questions ${suites.reduce((total, suite) => total + suite.questionCount, 0)}`,
                pl: `Pytania ${suites.reduce((total, suite) => total + suite.questionCount, 0)}`,
              })}
              tone={BASE_TONE}
            />
          </View>
          <View style={{ flexDirection: 'column', gap: 8 }}>
            <OutlineLink
              href={PRACTICE_ROUTE}
              hint={copy({
                de: 'Öffnet das Training.',
                en: 'Opens practice.',
                pl: 'Otwiera trening.',
              })}
              label={copy({
                de: 'Zur Übung',
                en: 'Go to practice',
                pl: 'Przejdź do treningu',
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
          </View>
        </SectionCard>

        {!activeSuite ? <KangurMobileAiTutorCard context={catalogTutorContext} /> : null}

        {missingFocusedSuite ? (
          <SectionCard
            title={copy({
              de: 'Testkürzel',
              en: 'Test shortcut',
              pl: 'Skrót testu',
            })}
          >
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: `Der Link zu "${formatFocusToken(focusToken)}" passt aktuell zu keinem live Testsatz.`,
                en: `The shortcut for "${formatFocusToken(focusToken)}" does not match any live test suite right now.`,
                pl: `Skrót do „${formatFocusToken(focusToken)}” nie pasuje teraz do żadnego aktywnego zestawu testów.`,
              })}
            </Text>
            <PrimaryButton
              label={copy({
                de: 'Vollen Katalog öffnen',
                en: 'Open full catalog',
                pl: 'Otwórz pełny katalog',
              })}
              onPress={() => {
                router.replace(TESTS_ROUTE);
              }}
              tone={BASE_TONE}
            />
          </SectionCard>
        ) : null}

        {activeSuite ? (
          <>
            <SectionCard title={activeSuite.suite.title}>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {activeSuite.suite.description.trim().length > 0
                  ? activeSuite.suite.description
                  : copy({
                      de: 'Pracuj przez ten zestaw we własnym tempie.',
                      en: 'Work through this suite at your own pace.',
                      pl: 'Przejdź przez ten zestaw we własnym tempie.',
                    })}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <StatusPill
                  label={formatQuestionCount(activeSuite.questionCount, locale)}
                  tone={SUCCESS_TONE}
                />
                {formatSuiteMeta(activeSuite.suite, locale).map((part) => (
                  <StatusPill key={part} label={part} tone={BASE_TONE} />
                ))}
              </View>
              <PrimaryButton
                label={copy({
                  de: 'Zurück zur Liste',
                  en: 'Back to the list',
                  pl: 'Wróć do listy',
                })}
                onPress={() => {
                  setActiveSuiteId(null);
                }}
                tone={BASE_TONE}
              />
            </SectionCard>
            <KangurMobileTestPlayer
              item={activeSuite}
              onBackToCatalog={() => {
                setActiveSuiteId(null);
              }}
            />
          </>
        ) : isLoading ? (
          <SectionCard
            title={copy({
              de: 'Tests werden geladen',
              en: 'Loading tests',
              pl: 'Ładujemy testy',
            })}
          >
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Wir holen die aktiven Testsätze und die veröffentlichten Fragen.',
                en: 'We are loading the live test suites and their published questions.',
                pl: 'Pobieramy aktywne zestawy testów i ich opublikowane pytania.',
              })}
            </Text>
          </SectionCard>
        ) : error ? (
          <SectionCard
            title={copy({
              de: 'Tests konnten nicht geladen werden',
              en: 'Could not load the tests',
              pl: 'Nie udało się pobrać testów',
            })}
          >
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {error}
            </Text>
            <PrimaryButton
              label={copy({
                de: 'Erneut laden',
                en: 'Reload tests',
                pl: 'Odśwież testy',
              })}
              onPress={() => {
                void refresh();
              }}
            />
          </SectionCard>
        ) : suites.length === 0 ? (
          <SectionCard
            title={copy({
              de: 'Keine aktiven Tests',
              en: 'No live tests',
              pl: 'Brak aktywnych testów',
            })}
          >
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Aktivierte Testsätze erscheinen hier automatisch, sobald sie für Lernende live sind.',
                en: 'Enabled test suites show up here automatically as soon as they are live for learners.',
                pl: 'Aktywne zestawy testów pojawią się tutaj automatycznie, gdy będą już opublikowane dla ucznia.',
              })}
            </Text>
          </SectionCard>
        ) : (
          suites.map((item) => (
            <SectionCard key={item.suite.id} title={item.suite.title}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <StatusPill
                  label={formatQuestionCount(item.questionCount, locale)}
                  tone={item.questionCount > 0 ? SUCCESS_TONE : WARNING_TONE}
                />
                {formatSuiteMeta(item.suite, locale).map((part) => (
                  <StatusPill key={part} label={part} tone={BASE_TONE} />
                ))}
              </View>
              {item.suite.description.trim().length > 0 ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {item.suite.description}
                </Text>
              ) : null}
              <PrimaryButton
                label={copy({
                  de: 'Test starten',
                  en: 'Start the test',
                  pl: 'Uruchom test',
                })}
                onPress={() => {
                  setActiveSuiteId(item.suite.id);
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
              de: 'Nach dem Testsatz kannst du zur Lektion, in das Training oder direkt in die Ergebnisse springen.',
              en: 'After the test suite, jump back to lessons, practice, or straight into results.',
              pl: 'Po zestawie możesz wrócić do lekcji, treningu albo od razu przejść do wyników.',
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
      </ScrollView>
    </SafeAreaView>
  );
}
