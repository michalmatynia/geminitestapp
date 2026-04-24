import { FormModal } from '@/features/kangur/shared/ui';
import { ConfirmModal } from '@/features/kangur/shared/ui/templates/modals';
import { KangurTestQuestionEditor } from '../KangurTestQuestionEditor';

export function QuestionsManagerModals({ controller, copy }: { controller: any; copy: any }) {
  const { state, mutations } = controller;
  
  return (
    <>
      <FormModal
        isOpen={state.showEditor}
        onClose={mutations.handleRequestClose}
        title={state.isNewQuestion ? copy.modal.addQuestionTitle : copy.modal.editQuestionTitle}
        onSave={mutations.handleSave}
        isSaving={state.isSaving}
      >
        <KangurTestQuestionEditor formData={state.formData} onChange={state.setFormData} />
      </FormModal>

      <ConfirmModal
        isOpen={Boolean(state.questionToDelete)}
        onClose={() => state.setQuestionToDelete(null)}
        onConfirm={mutations.handleDelete}
        title={copy.modal.deleteQuestionTitle}
        message='Are you sure you want to delete this question?'
        isDangerous
      />
    </>
  );
}
