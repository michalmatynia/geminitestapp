'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { getKangurHomeHref } from '@/features/kangur/config/routing';
import {
  KANGUR_TEST_SUITES_SETTING_KEY,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
} from '@/shared/contracts/kangur-tests';
import { parseKangurTestSuites } from '@/features/kangur/test-suites';
import {
  parseKangurTestQuestionStore,
  getQuestionsForSuite,
} from '@/features/kangur/test-questions';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurTestSuitePlayer } from '@/features/kangur/ui/components/KangurTestSuitePlayer';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurIconBadge,
  KangurOptionCardButton,
  KangurPageContainer,
  KangurPageShell,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';

export default function Tests(): React.JSX.Element {
  const router = useRouter();
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin, logout } = useKangurAuth();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('tests');
  const settingsStore = useSettingsStore();

  const rawSuites = settingsStore.get(KANGUR_TEST_SUITES_SETTING_KEY);
  const rawQuestions = settingsStore.get(KANGUR_TEST_QUESTIONS_SETTING_KEY);

  const suites = useMemo(() => parseKangurTestSuites(rawSuites), [rawSuites]);
  const questionStore = useMemo(() => parseKangurTestQuestionStore(rawQuestions), [rawQuestions]);

  const enabledSuites = useMemo(() => suites.filter((s) => s.enabled), [suites]);

  const [activeSuite, setActiveSuite] = useState<KangurTestSuite | null>(null);

  const activeSuiteQuestions = useMemo(
    () => (activeSuite ? getQuestionsForSuite(questionStore, activeSuite.id) : []),
    [activeSuite, questionStore]
  );
  const learnerId = user?.activeLearner?.id ?? user?.id ?? null;
  const handleGoBack = (): void => {
    router.push(getKangurHomeHref(basePath));
  };
  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      contentClassName: 'justify-center',
      currentPage: 'Tests' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      isAuthenticated: Boolean(user),
      onCreateAccount: () => navigateToLogin({ authMode: 'create-account' }),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: navigateToLogin,
      onLogout: () => logout(false),
      showParentDashboard: false,
    }),
    [basePath, guestPlayerName, logout, navigateToLogin, setGuestPlayerName, user]
  );

  return (
    <KangurPageShell tone='learn' id='kangur-tests-page' skipLinkTargetId='kangur-tests-main'>
      <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId='kangur-tests-page' />
      <KangurTopNavigationController navigation={navigation} />

      <KangurPageContainer id='kangur-tests-main'>
        <AnimatePresence initial={false} mode='wait'>
          {activeSuite ? (
            <motion.div
              key={`suite-${activeSuite.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='w-full max-w-xl mx-auto'
            >
              <KangurGlassPanel
                className='w-full flex flex-col gap-4'
                padding='xl'
                surface='mistStrong'
                variant='soft'
              >
                <KangurSummaryPanel
                  accent='indigo'
                  description={activeSuite.description || undefined}
                  label='Zestaw testowy'
                  labelAccent='indigo'
                  padding='lg'
                  title={activeSuite.title}
                >
                  <div className='mt-3 flex flex-wrap items-center gap-2'>
                    {activeSuite.year ? (
                      <KangurStatusChip accent='slate' size='sm'>
                        {activeSuite.year}
                      </KangurStatusChip>
                    ) : null}
                    {activeSuite.gradeLevel ? (
                      <KangurStatusChip accent='slate' size='sm'>
                        {activeSuite.gradeLevel}
                      </KangurStatusChip>
                    ) : null}
                    <KangurStatusChip accent='indigo' size='sm'>
                      {activeSuiteQuestions.length} pytań
                    </KangurStatusChip>
                  </div>
                  <div className='mt-4 flex justify-start md:justify-end'>
                    <KangurButton
                      type='button'
                      onClick={(): void => setActiveSuite(null)}
                      size='sm'
                      variant='surface'
                      data-doc-id='tests_back_button'
                    >
                      ← Wróć
                    </KangurButton>
                  </div>
                </KangurSummaryPanel>

                <KangurTestSuitePlayer
                  suite={activeSuite}
                  questions={activeSuiteQuestions}
                  learnerId={learnerId}
                  onFinish={(): void => {}}
                />
              </KangurGlassPanel>
            </motion.div>
          ) : (
            <motion.div
              key='suite-list'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='mx-auto flex w-full max-w-2xl flex-col items-center gap-4'
            >
              <KangurPageIntroCard
                accent='indigo'
                className='max-w-md'
                description='Wybierz zestaw testowy, aby rozpocząć.'
                headingAs='h1'
                headingTestId='kangur-tests-list-heading'
                onBack={handleGoBack}
                testId='kangur-tests-list-top-section'
                title='Testy Kangur'
              />

              {enabledSuites.length === 0 ? (
                <KangurEmptyState
                  accent='indigo'
                  className='w-full'
                  description='Skontaktuj się z administratorem.'
                  padding='xl'
                  title='Brak aktywnych zestawów testowych.'
                />
              ) : (
                <div className='flex w-full flex-col gap-3'>
                  {enabledSuites.map((suite) => {
                    const questionCount = getQuestionsForSuite(questionStore, suite.id).length;
                    return (
                      <KangurOptionCardButton
                        accent='indigo'
                        key={suite.id}
                        className='flex items-center gap-4'
                        data-doc-id='tests_suite_card'
                        emphasis='neutral'
                        onClick={(): void => setActiveSuite(suite)}
                        type='button'
                      >
                        <KangurIconBadge
                          accent='indigo'
                          className='shrink-0 text-2xl'
                          data-testid={`tests-suite-icon-${suite.id}`}
                          size='md'
                        >
                          🦘
                        </KangurIconBadge>
                        <div className='min-w-0 flex-1 text-left'>
                          <div className='truncate font-bold text-indigo-900'>{suite.title}</div>
                          {suite.description ? (
                            <div className='mt-0.5 truncate text-xs text-indigo-500'>
                              {suite.description}
                            </div>
                          ) : null}
                          <div className='mt-2 flex flex-wrap items-center gap-2'>
                            {suite.year ? (
                              <KangurStatusChip accent='slate' size='sm'>
                                {suite.year}
                              </KangurStatusChip>
                            ) : null}
                            {suite.gradeLevel ? (
                              <KangurStatusChip accent='slate' size='sm'>
                                {suite.gradeLevel}
                              </KangurStatusChip>
                            ) : null}
                            <KangurStatusChip accent='indigo' size='sm'>
                              {questionCount} pytań
                            </KangurStatusChip>
                          </div>
                        </div>
                        <div className='shrink-0 text-indigo-300'>›</div>
                      </KangurOptionCardButton>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </KangurPageContainer>
    </KangurPageShell>
  );
}
