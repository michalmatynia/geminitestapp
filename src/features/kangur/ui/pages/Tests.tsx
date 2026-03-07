import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LayoutGrid, Trophy } from 'lucide-react';
import Link from 'next/link';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import {
  KANGUR_TEST_SUITES_SETTING_KEY,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
} from '@/shared/contracts/kangur-tests';
import { parseKangurTestSuites } from '@/features/kangur/test-suites';
import {
  parseKangurTestQuestionStore,
  getQuestionsForSuite,
} from '@/features/kangur/test-questions';
import { KangurTestSuitePlayer } from '@/features/kangur/ui/components/KangurTestSuitePlayer';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurIconBadge,
  KangurOptionCardButton,
  KangurPageContainer,
  KangurPageShell,
  KangurPageTopBar,
  KangurPanel,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';

export default function Tests(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin, logout } = useKangurAuth();
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

  return (
    <KangurPageShell
      tone='learn'
      className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100'
      id='kangur-tests-page'
      skipLinkTargetId='kangur-tests-main'
    >
      <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId='kangur-tests-page' />
      <KangurPageTopBar
        contentClassName='justify-center'
        left={
          <KangurTopNavGroup>
            <KangurButton asChild size='md' variant='navigation' data-doc-id='top_nav_home'>
              <Link href={createPageUrl('Game', basePath)}>
                <Home className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Strona glowna</span>
              </Link>
            </KangurButton>
            <KangurButton asChild size='md' variant='navigation' data-doc-id='top_nav_lessons'>
              <Link href={createPageUrl('Lessons', basePath)}>
                <LayoutGrid className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Lekcje</span>
              </Link>
            </KangurButton>
            <KangurButton
              size='md'
              variant='navigationActive'
              aria-current='page'
              data-doc-id='top_nav_tests'
            >
              <Trophy className='h-[22px] w-[22px]' strokeWidth={2.1} />
              <span>Testy</span>
            </KangurButton>
          </KangurTopNavGroup>
        }
        right={
          <KangurProfileMenu
            basePath={basePath}
            isAuthenticated={Boolean(user)}
            onLogout={() => logout(false)}
            onLogin={navigateToLogin}
          />
        }
      />

      <KangurPageContainer id='kangur-tests-main'>
        <AnimatePresence mode='wait'>
          {activeSuite ? (
            <motion.div
              key={`suite-${activeSuite.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='w-full max-w-xl mx-auto'
            >
              <KangurPanel className='w-full flex flex-col gap-4' padding='xl' variant='elevated'>
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
                      variant='secondary'
                      data-doc-id='tests_back_button'
                    >
                      ← Wróć
                    </KangurButton>
                  </div>
                </KangurSummaryPanel>

                <KangurTestSuitePlayer
                  suite={activeSuite}
                  questions={activeSuiteQuestions}
                  onFinish={(): void => {}}
                />
              </KangurPanel>
            </motion.div>
          ) : (
            <motion.div
              key='suite-list'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='w-full max-w-2xl mx-auto'
            >
              <div className='mb-6 text-center'>
                <h1 className='text-2xl font-extrabold text-indigo-900'>🦘 Testy Kangur</h1>
                <p className='mt-1 text-sm text-indigo-500'>
                  Wybierz zestaw testowy, aby rozpocząć.
                </p>
              </div>

              {enabledSuites.length === 0 ? (
                <KangurEmptyState
                  accent='indigo'
                  description='Skontaktuj się z administratorem.'
                  padding='xl'
                  title='Brak aktywnych zestawów testowych.'
                />
              ) : (
                <div className='flex flex-col gap-3'>
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
