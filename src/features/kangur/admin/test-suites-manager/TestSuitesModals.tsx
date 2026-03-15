
import { FormModal, Input } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { TestSuiteMetadataForm } from '../components/TestSuiteMetadataForm';
import { useTestSuitesManager } from './test-suites-manager.context';
import { useTestSuitesManagerLogic } from './test-suites-manager.logic';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { KangurTestGroup } from '@/shared/contracts/kangur-tests';

export function TestSuitesModals() {
  const settingsStore = useSettingsStore();
  const state = useTestSuitesManager();
  const logic = useTestSuitesManagerLogic(settingsStore);

  const isSaveDisabled = !state.formData.title.trim() || !state.formData.category.trim() || logic.isUpdating;
  const isGroupSaveDisabled = !state.groupTitle.trim() || logic.isUpdating;

  return (
    <>
      {/* Suite create/edit modal */}
      <FormModal
        isOpen={state.showModal}
        onClose={(): void => {
          state.setShowModal(false);
          state.setEditingSuite(null);
        }}
        title={state.editingSuite ? 'Edit Suite' : 'Create Suite'}
        subtitle='Test suites belong to a persisted test group and collect questions for one exam session.'
        onSave={(): void => {
          void logic.handleSaveSuite();
        }}
        isSaving={logic.isUpdating}
        isSaveDisabled={isSaveDisabled}
        saveText={state.editingSuite ? 'Save Suite' : 'Create Suite'}
      >
        <TestSuiteMetadataForm formData={state.formData} setFormData={state.setFormData} />
      </FormModal>

      {/* Group create/edit modal */}
      <FormModal
        isOpen={state.showGroupModal}
        onClose={(): void => {
          state.setShowGroupModal(false);
        }}
        title='Create Test Group'
        subtitle='Create a reusable group for organizing Kangur test suites.'
        onSave={(): void => {
          void logic.handleSaveGroup();
        }}
        isSaving={logic.isUpdating}
        isSaveDisabled={isGroupSaveDisabled}
        saveText='Create Group'
      >
        <div className='space-y-4'>
          <Input
            value={state.groupTitle}
            onChange={(event): void => state.setGroupTitle(event.target.value)}
            placeholder='e.g. Olympiad 2024'
            className='h-9'
            aria-label='e.g. Olympiad 2024'
            title='e.g. Olympiad 2024'
          />
          <textarea
            value={state.groupDescription}
            onChange={(event): void => state.setGroupDescription(event.target.value)}
            placeholder='Optional description for this group'
            aria-label='Group description'
            className='min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm'
          />
        </div>
      </FormModal>

      {/* Move suite modal */}
      <FormModal
        isOpen={Boolean(state.suiteToMove)}
        onClose={(): void => {
          state.setSuiteToMove(null);
          state.setSuiteMoveTargetGroupTitle('');
        }}
        title='Move Suite To Another Group'
        subtitle='Reassign this suite without opening the full suite editor.'
        onSave={(): void => {
          void logic.handleMoveSuiteToGroup();
        }}
        isSaving={logic.isUpdating}
        isSaveDisabled={!state.suiteMoveTargetGroupTitle.trim() || logic.isUpdating}
        saveText='Move Suite'
      >
        <div className='space-y-4'>
          <div className='rounded-xl border border-border/50 bg-background/30 p-3 text-sm text-muted-foreground'>
            Suite: <span className='font-semibold text-white'>{state.suiteToMove?.title ?? ''}</span>
          </div>
          <select
            value={state.suiteMoveTargetGroupTitle}
            onChange={(event): void => state.setSuiteMoveTargetGroupTitle(event.target.value)}
            className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm'
            aria-label='Destination group'
            title='Destination group'
          >
            <option value=''>Choose destination group</option>
            {logic.resolvedGroups?.map((group: KangurTestGroup) => (
              <option key={group.id} value={group.title}>
                {group.title}
              </option>
            ))}
          </select>
        </div>
      </FormModal>

      {/* Delete group confirm */}
      <ConfirmModal
        isOpen={Boolean(state.groupToDeleteTitle)}
        onClose={(): void => state.setGroupToDeleteTitle(null)}
        onConfirm={logic.handleDeleteGroup}
        title='Delete Test Group'
        message={`Delete test group "${state.groupToDeleteTitle ?? ''}"? Only empty groups can be removed.`}
        confirmText='Delete'
        isDangerous={true}
      />

      {/* Delete suite confirm */}
      <ConfirmModal
        isOpen={Boolean(state.suiteToDelete)}
        onClose={(): void => state.setSuiteToDelete(null)}
        onConfirm={logic.handleDeleteSuite}
        title='Delete Suite'
        message={`Delete suite "${state.suiteToDelete?.title ?? ''}" and all its questions? This cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />
    </>
  );
}
