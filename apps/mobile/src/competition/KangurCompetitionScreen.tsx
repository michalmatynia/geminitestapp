import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurLessonsCatalogHref } from '../lessons/lessonHref';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import { KangurMobileScrollScreen } from '../shared/KangurMobileUi';
import { createKangurTestsHref } from '../tests/testsHref';
import { KangurMobileCompetitionPlayer } from './competition-player';
import { createKangurCompetitionHref } from './competitionHref';
import {
  BASE_TONE,
  INDIGO_TONE,
  OutlineLink,
  PrimaryButton,
  SectionCard,
  StatusPill,
  SUCCESS_TONE,
  WARNING_TONE,
} from './competition-primitives';
import {
  formatCompetitionModeDescription,
  formatCompetitionModeTitle,
  formatCompetitionTierLabel,
  formatModeToken,
  formatQuestionCount,
} from './competition-utils';
import {
  useKangurMobileCompetition,
  type KangurMobileCompetitionMode,
} from './useKangurMobileCompetition';

const COMPETITION_ROUTE = createKangurCompetitionHref();
const TESTS_ROUTE = createKangurTestsHref();
const LESSONS_ROUTE = createKangurLessonsCatalogHref();
const PRACTICE_ROUTE = createKangurPracticeHref('mixed');
const PLAN_ROUTE = createKangurPlanHref();
const RESULTS_ROUTE = createKangurResultsHref();

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
