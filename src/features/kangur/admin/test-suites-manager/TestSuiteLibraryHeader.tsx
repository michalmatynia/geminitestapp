
import { AlertTriangle, ClipboardList, Folders, ListOrdered, Plus, Sparkles, WandSparkles } from 'lucide-react';
import { Button } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils/ui-utils';
import { useTestSuitesManager } from './test-suites-manager.context';
import { useTestSuitesManagerLogic } from './test-suites-manager.logic';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { KANGUR_STACK_RELAXED_CLASSNAME } from '@/features/kangur/ui/design/tokens';

export function TestSuiteLibraryHeader() {
  const settingsStore = useSettingsStore();
  const state = useTestSuitesManager();
  const logic = useTestSuitesManagerLogic(settingsStore);
  const handleTakeLiveSuitesOffline = (): void => {
    void (logic.handleTakeLiveSuitesOffline as () => Promise<void>)();
  };
  const handleGoLiveReadySuites = (): void => {
    void (logic.handleGoLiveReadySuites as () => Promise<void>)();
  };
  const handlePublishReadyQueue = (): void => {
    void (logic.handlePublishReadyQueue as () => Promise<void>)();
  };

  return (
    <div className='overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(10,18,32,0.95),rgba(19,38,61,0.86))] p-5 sm:p-6 shadow-[0_24px_90px_-52px_rgba(14,165,233,0.35)]'>
      <div className={`${KANGUR_STACK_RELAXED_CLASSNAME} xl:flex-row xl:items-center xl:justify-between`}>
        <div className='max-w-3xl space-y-2'>
          <div className='text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80'>
            Suite library
          </div>
          <div className='text-lg font-semibold text-white'>Test Suite Library</div>
          <div className='text-sm leading-6 text-slate-300'>
            Each suite contains questions with scoring and optional SVG illustrations.
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2.5 xl:justify-end'>
          <Button
            onClick={() => {
              handleTakeLiveSuitesOffline();
            }}
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full border px-3 text-[11px] font-semibold tracking-wide text-slate-200 hover:bg-slate-800/50 sm:w-auto'
            disabled={logic.isUpdating || logic.liveSuiteIds.length === 0}
          >
            <AlertTriangle className='mr-1 size-3.5' />
            Take live suites offline
          </Button>
          <Button
            onClick={() => {
              handleGoLiveReadySuites();
            }}
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full border px-3 text-[11px] font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30 sm:w-auto'
            disabled={logic.isUpdating || logic.liveReadySuiteIds.length === 0}
          >
            <Folders className='mr-1 size-3.5' />
            Go live ready suites
          </Button>
          <Button
            onClick={() => {
              handlePublishReadyQueue();
            }}
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full border px-3 text-[11px] font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30 sm:w-auto'
            disabled={logic.isUpdating || logic.totalPublishableQuestionCount === 0}
          >
            <WandSparkles className='mr-1 size-3.5' />
            Publish ready queue
          </Button>
          <Button
            onClick={logic.handleOpenReviewQueue}
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full border px-3 text-[11px] font-semibold tracking-wide text-cyan-200 hover:bg-cyan-900/30 sm:w-auto'
            disabled={logic.isUpdating || !logic.firstSuiteNeedingAttention}
          >
            <ClipboardList className='mr-1 size-3.5' />
            Open review queue
          </Button>
          <Button
            onClick={logic.handleOpenFirstFix}
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full border px-3 text-[11px] font-semibold tracking-wide text-rose-200 hover:bg-rose-900/30 sm:w-auto'
            disabled={logic.isUpdating || !logic.firstFixQuestion}
          >
            <AlertTriangle className='mr-1 size-3.5' />
            Open first fix
          </Button>
          <Button
            onClick={() => {
              // void logic.handleImportLegacy();
            }}
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full border px-3 text-[11px] font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30 sm:w-auto'
            disabled={logic.isUpdating}
          >
            <Sparkles className='mr-1 size-3.5' />
            Import legacy data
          </Button>
          <Button
            onClick={state.setShowGroupModal.bind(null, true)}
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full border px-3 text-[11px] font-semibold tracking-wide text-gray-200 hover:bg-muted/50 sm:w-auto'
            disabled={logic.isUpdating}
          >
            <Folders className='mr-1 size-3.5' />
            Add group
          </Button>
          <Button
            onClick={logic.openCreateModal}
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full border px-3 text-[11px] font-semibold tracking-wide text-gray-200 hover:bg-muted/50 sm:w-auto'
            disabled={logic.isUpdating}
          >
            <Plus className='mr-1 size-3.5' />
            Add suite
          </Button>
        </div>
      </div>

      <div className='mt-4 flex flex-wrap items-center gap-2.5'>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className={cn(
            'h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide',
            state.treeMode === 'ordered'
              ? 'border-sky-300/70 bg-sky-500/20 text-sky-100'
              : 'text-gray-300 hover:bg-muted/40'
          )}
          onClick={() => state.setTreeMode('ordered')}
          disabled={logic.isUpdating}
        >
          <ListOrdered className='mr-1 size-3.5' />
          Ordered
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className={cn(
            'h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide',
            state.treeMode === 'catalog'
              ? 'border-sky-300/70 bg-sky-500/20 text-sky-100'
              : 'text-gray-300 hover:bg-muted/40'
          )}
          onClick={() => state.setTreeMode('catalog')}
          disabled={logic.isUpdating}
        >
          <Folders className='mr-1 size-3.5' />
          Catalog
        </Button>
      </div>
    </div>
  );
}
