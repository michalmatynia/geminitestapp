import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useEffect, useState, useMemo } from 'react';

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
  OutlineLink,
  SectionCard,
} from './competition-primitives';
import {
  useKangurMobileCompetition,
  type KangurMobileCompetitionMode,
} from './useKangurMobileCompetition';
import {
  CompetitionHeaderSection,
  CompetitionModeCard,
  CompetitionMissingModeSection,
} from './CompetitionScreenSections';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';

const COMPETITION_ROUTE = createKangurCompetitionHref();
const TESTS_ROUTE = createKangurTestsHref();
const LESSONS_ROUTE = createKangurLessonsCatalogHref();
const PRACTICE_ROUTE = createKangurPracticeHref('mixed');
const PLAN_ROUTE = createKangurPlanHref();
const RESULTS_ROUTE = createKangurResultsHref();

type ModeItem = {
  mode: KangurMobileCompetitionMode;
  questionCount: number;
  pointTier: string;
};

const NextStepsSection = ({ copy }: { copy: (dict: { de: string; en: string; pl: string }) => string }): JSX.Element => (
  <SectionCard
    title={copy({ de: 'Nächste Schritte', en: 'Next steps', pl: 'Kolejne kroki' })}
  >
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {copy({
        de: 'Nach der Wettbewerbsrunde kannst du zu Lektionen, Training oder dem Tagesplan wechseln.',
        en: 'After the competition round, move into lessons, practice, or the daily plan.',
        pl: 'Po rundzie konkursowej możesz przejść do lekcji, treningu albo planu dnia.',
      })}
    </Text>
    <OutlineLink
      href={LESSONS_ROUTE}
      hint={copy({ de: 'Öffnet die Lektionen.', en: 'Opens lessons.', pl: 'Otwiera lekcje.' })}
      label={copy({ de: 'Lektionen öffnen', en: 'Open lessons', pl: 'Otwórz lekcje' })}
    />
    <OutlineLink
      href={PRACTICE_ROUTE}
      hint={copy({ de: 'Öffnet das Training.', en: 'Opens practice.', pl: 'Otwiera trening.' })}
      label={copy({ de: 'Training öffnen', en: 'Open practice', pl: 'Otwórz trening' })}
    />
  </SectionCard>
);

const ModesList = ({
  activeItem,
  copy,
  locale,
  modes,
  onSetActiveMode,
}: {
  activeItem: ModeItem | null;
  copy: (dict: { de: string; en: string; pl: string }) => string;
  locale: KangurMobileLocale;
  modes: ModeItem[];
  onSetActiveMode: (mode: KangurMobileCompetitionMode | null) => void;
}): JSX.Element => (
  <>
    {activeItem !== null ? (
      <>
        <CompetitionModeCard
          copy={copy}
          item={activeItem}
          locale={locale}
          onPress={() => onSetActiveMode(null)}
        />
        <KangurMobileCompetitionPlayer
          item={activeItem}
          onBackToCatalog={() => onSetActiveMode(null)}
        />
      </>
    ) : (
      modes.map((item) => (
        <CompetitionModeCard
          key={item.mode}
          copy={copy}
          item={item}
          locale={locale}
          onPress={() => onSetActiveMode(item.mode)}
          isStart
        />
      ))
    )}
  </>
);

const useAppStartupSync = (
  focusedMode: KangurMobileCompetitionMode | null,
  modes: Array<{ mode: KangurMobileCompetitionMode }>,
  activeMode: KangurMobileCompetitionMode | null,
  setActiveMode: (m: KangurMobileCompetitionMode | null) => void,
): void => {
  useEffect(() => {
    if (focusedMode !== null) setActiveMode(focusedMode);
  }, [focusedMode, setActiveMode]);

  useEffect(() => {
    if (activeMode !== null && !modes.some((m) => m.mode === activeMode)) {
      setActiveMode(null);
    }
  }, [activeMode, modes, setActiveMode]);
};

const MainSection = ({
  activeItem,
  copy,
  modes,
  totalQuestions,
  setupTutorContext,
  modeToken,
  focusedMode,
  router,
  locale,
  setActiveMode,
}: {
  activeItem: ModeItem | null;
  copy: (dict: { de: string; en: string; pl: string }) => string;
  modes: ModeItem[];
  totalQuestions: number;
  setupTutorContext: {
    contentId: string;
    focusId: string;
    focusKind: 'screen';
    surface: 'game';
    title: string;
  };
  modeToken: string | null;
  focusedMode: KangurMobileCompetitionMode | null;
  router: ReturnType<typeof useRouter>;
  locale: KangurMobileLocale;
  setActiveMode: (m: KangurMobileCompetitionMode | null) => void;
}): JSX.Element => (
  <KangurMobileScrollScreen
    backgroundColor='#f8fafc'
    contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}
    edges={['top', 'left', 'right']}
    keyboardShouldPersistTaps='handled'
  >
    <CompetitionHeaderSection
      copy={copy}
      modesCount={modes.length}
      questionCount={totalQuestions}
      routes={{ tests: TESTS_ROUTE, results: RESULTS_ROUTE, plan: PLAN_ROUTE }}
    />
    {activeItem === null && <KangurMobileAiTutorCard context={setupTutorContext} gameTarget='competition' />}
    {(modeToken !== null && focusedMode === null && activeItem === null) && (
      <CompetitionMissingModeSection copy={copy} modeToken={modeToken} onOpenFull={() => router.replace(COMPETITION_ROUTE)} />
    )}
    <ModesList activeItem={activeItem} copy={copy} locale={locale} modes={modes} onSetActiveMode={setActiveMode} />
    <NextStepsSection copy={copy} />
  </KangurMobileScrollScreen>
);

export function KangurCompetitionScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const router = useRouter();
  const { copy, locale } = useKangurMobileI18n();
  const rawModeParam = Array.isArray(params.mode) ? params.mode[0] ?? null : params.mode ?? null;
  const { focusedMode, modeToken, modes } = useKangurMobileCompetition(rawModeParam);
  const [activeMode, setActiveMode] = useState<KangurMobileCompetitionMode | null>(null);

  useAppStartupSync(focusedMode, modes, activeMode, setActiveMode);

  const activeItem = modes.find((item) => item.mode === activeMode) ?? null;
  const setupTutorContext = useMemo(() => ({
    contentId: 'game:kangur:setup',
    focusId: 'kangur-game-kangur-setup',
    focusKind: 'screen' as const,
    surface: 'game' as const,
    title: copy({ de: 'Kangur-Wettbewerb', en: 'Kangaroo competition', pl: 'Konkurs Kangur' }),
  }), [copy]);

  const totalQuestions = useMemo(() => modes.reduce((total, m) => total + m.questionCount, 0), [modes]);

  return (
    <MainSection
      activeItem={activeItem}
      copy={copy}
      modes={modes}
      totalQuestions={totalQuestions}
      setupTutorContext={setupTutorContext}
      modeToken={modeToken}
      focusedMode={focusedMode}
      router={router}
      locale={locale}
      setActiveMode={setActiveMode}
    />
  );
}
