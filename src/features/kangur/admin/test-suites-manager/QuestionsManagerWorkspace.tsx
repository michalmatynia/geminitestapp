
import { Button, FormModal } from '@/shared/ui';
import { KangurAdminContentShell } from '../components/KangurAdminContentShell';
import { KangurQuestionsManagerRuntimeProvider } from '../context/KangurQuestionsManagerRuntimeContext';
import { KangurQuestionsManagerPanel } from '../KangurQuestionsManagerPanel';
import { useTestSuitesManager } from './test-suites-manager.context';
import { useTestSuitesManagerLogic } from './test-suites-manager.logic';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { resolveKangurTestSuiteGroupTitle } from '../../test-suites';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';

export function QuestionsManagerWorkspace({ standalone }: { standalone: boolean }) {
  const settingsStore = useSettingsStore();
  const state = useTestSuitesManager();
  const logic = useTestSuitesManagerLogic(settingsStore);

  if (!state.managingSuite) return null;

  const targetSuites = logic.suites.filter(
    (suite: KangurTestSuite) => suite.id !== state.managingSuite?.id
  );
  const currentManagedSuiteQuestionCount = logic.questionCountBySuiteId.get(state.managingSuite.id) ?? 0;

  const questionsContent = (
    <div className='flex h-full flex-col gap-4 overflow-hidden'>
      <div className='overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(10,18,32,0.96),rgba(22,29,58,0.88))] p-6 shadow-[0_24px_80px_-46px_rgba(168,85,247,0.38)]'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='max-w-3xl space-y-2'>
            <div className='text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/80'>
              Suite authoring workspace
            </div>
            <div className='text-lg font-semibold text-white'>Suite operations</div>
            <div className='text-sm leading-6 text-slate-300'>
              Move the entire question set into another suite, including suites in other test groups.
            </div>
          </div>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 rounded-full border px-3 text-xs font-semibold tracking-wide text-violet-200 hover:bg-violet-900/30'
            onClick={(): void => {
              state.setQuestionMoveTargetSuiteId('');
              state.setShowQuestionMoveModal(true);
            }}
            disabled={logic.isUpdating || currentManagedSuiteQuestionCount === 0}
          >
            Move all {currentManagedSuiteQuestionCount} questions
          </Button>
        </div>
      </div>
      <div className='flex-1 overflow-hidden rounded-[28px] border border-border/60 bg-card/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'>
        <KangurQuestionsManagerRuntimeProvider
          suite={state.managingSuite}
          onClose={(): void => {
            state.setManagingSuite(null);
            state.setManagerInitialView(undefined);
          }}
          initialView={state.managerInitialView}
        >
          <KangurQuestionsManagerPanel />
        </KangurQuestionsManagerRuntimeProvider>
      </div>
      <FormModal
        isOpen={state.showQuestionMoveModal}
        onClose={(): void => {
          state.setShowQuestionMoveModal(false);
          state.setQuestionMoveTargetSuiteId('');
        }}
        title='Move Questions To Another Suite'
        subtitle='Bulk-move the full question set from the current suite into another destination suite.'
        onSave={(): void => {
          void logic.handleBulkMoveQuestions();
        }}
        isSaving={logic.isUpdating}
        isSaveDisabled={!state.questionMoveTargetSuiteId || logic.isUpdating}
        saveText='Move Questions'
      >
        <div className='space-y-4'>
          <div className='rounded-xl border border-border/50 bg-background/30 p-3 text-sm text-muted-foreground'>
            Source suite: <span className='font-semibold text-white'>{state.managingSuite.title}</span>
          </div>
          <select
            value={state.questionMoveTargetSuiteId}
            onChange={(event): void => state.setQuestionMoveTargetSuiteId(event.target.value)}
            className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm'
            aria-label='Destination suite'
            title='Destination suite'
          >
            <option value=''>Choose destination suite</option>
            {targetSuites.map((suite: KangurTestSuite) => (
              <option key={suite.id} value={suite.id}>
                {resolveKangurTestSuiteGroupTitle(suite, logic.groupById)} / {suite.title}
              </option>
            ))}
          </select>
        </div>
      </FormModal>
    </div>
  );

  if (!standalone) {
    return questionsContent;
  }

  return (
    <KangurAdminContentShell
      title='Kangur Questions'
      description='Author questions for this test suite.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Tests', href: '/admin/kangur/tests-manager' },
        { label: state.managingSuite.title },
      ]}
      className='h-full'
      panelClassName='flex h-full min-h-0 flex-col'
      contentClassName='flex min-h-0 flex-1 flex-col'
    >
      {questionsContent}
    </KangurAdminContentShell>
  );
}
