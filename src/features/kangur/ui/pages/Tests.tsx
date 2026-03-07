import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LayoutGrid, Trophy } from 'lucide-react';
import Link from 'next/link';

import { getKangurPageHref as createPageUrl } from '@/shared/contracts/kangur';
import {
  KANGUR_TEST_SUITES_SETTING_KEY,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
} from '@/shared/contracts/kangur-tests';
import { parseKangurTestSuites } from '@/features/kangur/test-suites';
import { parseKangurTestQuestionStore, getQuestionsForSuite } from '@/features/kangur/test-questions';
import { KangurTestSuitePlayer } from '@/features/kangur/ui/components/KangurTestSuitePlayer';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
  KangurPageContainer,
  KangurPageShell,
  KangurPageTopBar,
  KangurPanel,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_OPTION_CARD_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { cn } from '@/shared/utils';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';

export default function Tests(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin, logout } = useKangurAuth();
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
    <KangurPageShell tone='learn' className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100'>
      <KangurPageTopBar
        contentClassName='justify-center'
        left={
          <KangurTopNavGroup>
            <KangurButton asChild size='md' variant='navigation'>
              <Link href={createPageUrl('Game', basePath)}>
                <Home className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Strona glowna</span>
              </Link>
            </KangurButton>
            <KangurButton asChild size='md' variant='navigation'>
              <Link href={createPageUrl('Lessons', basePath)}>
                <LayoutGrid className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Lekcje</span>
              </Link>
            </KangurButton>
            <KangurButton size='md' variant='navigationActive'>
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

      <KangurPageContainer>
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
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <h2 className='text-xl font-extrabold text-indigo-800'>{activeSuite.title}</h2>
                    {activeSuite.description ? (
                      <p className='mt-1 text-sm text-indigo-500'>{activeSuite.description}</p>
                    ) : null}
                    <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400'>
                      {activeSuite.year ? <span>{activeSuite.year}</span> : null}
                      {activeSuite.gradeLevel ? <span>· {activeSuite.gradeLevel}</span> : null}
                      <span>· {activeSuiteQuestions.length} pytań</span>
                    </div>
                  </div>
                  <KangurButton
                    type='button'
                    onClick={(): void => setActiveSuite(null)}
                    size='sm'
                    variant='secondary'
                  >
                    ← Wróć
                  </KangurButton>
                </div>

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
                <KangurPanel className='text-center py-12' variant='soft'>
                  <p className='text-indigo-400 text-sm'>
                    Brak aktywnych zestawów testowych.<br />
                    Skontaktuj się z administratorem.
                  </p>
                </KangurPanel>
              ) : (
                <div className='flex flex-col gap-3'>
                  {enabledSuites.map((suite) => {
                    const questionCount = getQuestionsForSuite(questionStore, suite.id).length;
                    return (
                      <button
                        key={suite.id}
                        type='button'
                        onClick={(): void => setActiveSuite(suite)}
                        className={cn(
                          KANGUR_OPTION_CARD_CLASSNAME,
                          'flex items-center gap-4'
                        )}
                      >
                        <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-2xl'>
                          🦘
                        </div>
                        <div className='min-w-0 flex-1 text-left'>
                          <div className='truncate font-bold text-indigo-900'>{suite.title}</div>
                          {suite.description ? (
                            <div className='mt-0.5 truncate text-xs text-indigo-500'>
                              {suite.description}
                            </div>
                          ) : null}
                          <div className='mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400'>
                            {suite.year ? <span>{suite.year}</span> : null}
                            {suite.gradeLevel ? <span>· {suite.gradeLevel}</span> : null}
                            <span>· {questionCount} pytań</span>
                          </div>
                        </div>
                        <div className='shrink-0 text-indigo-300'>›</div>
                      </button>
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
