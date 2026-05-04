'use client';

import React from 'react';
import { FormModal } from '@/features/kangur/shared/ui';
import { ConfirmModal } from '@/features/kangur/shared/ui/templates/modals';
import { LessonMetadataForm } from './LessonMetadataForm';
import { LessonContentEditorDialog } from './LessonContentEditorDialog';
import { LessonSvgQuickAddModal } from './LessonSvgQuickAddModal';
import type { UseAdminKangurLessonsManagerLogicReturn } from '../hooks/lessons-manager/useAdminKangurLessonsManagerLogic';

export function LessonsManagerModals({
  logic,
}: {
  logic: UseAdminKangurLessonsManagerLogicReturn;
}): React.JSX.Element {
  return (
    <>
      <FormModal
        title={logic.editingLesson ? 'Edit Lesson' : 'Create Lesson'}
        isOpen={logic.showModal}
        onClose={logic.handleCloseModal}
        onSave={() => {
          void logic.handleSave();
        }}
        isSaving={logic.isSaving}
        saveText={logic.editingLesson ? 'Save Lesson' : 'Create Lesson'}
      >
        <LessonMetadataForm
          formData={logic.formData}
          setFormData={logic.setFormData}
          componentContentJson={logic.componentContentJson}
          setComponentContentJson={logic.setComponentContentJson}
          showComponentContentEditor={logic.showComponentContentEditor}
          onComponentChange={logic.handleComponentChange}
        />
      </FormModal>

      <ConfirmModal
        isOpen={Boolean(logic.lessonToDelete)}
        onClose={() => logic.setLessonToDelete(null)}
        onConfirm={() => {
          void logic.handleDelete();
        }}
        title='Delete Lesson'
        message={`Are you sure you want to delete "${logic.lessonToDelete?.title ?? 'this lesson'}"? This will also remove its content document.`}
        confirmLabel='Delete'
        variant='danger'
      />

      <ContentEditorModal logic={logic} />
      <LessonSvgQuickAddModal />
    </>
  );
}

function ContentEditorModal({ logic }: { logic: UseAdminKangurLessonsManagerLogicReturn }): React.JSX.Element | null {
  if (!logic.editingContentLesson) return null;

  return (
    <LessonContentEditorDialog
      isOpen={logic.showContentModal}
      onClose={() => {
        logic.setShowContentModal(false);
        logic.setEditingContentLesson(null);
      }}
      lesson={logic.editingContentLesson}
      document={logic.contentDraft}
      onLessonChange={logic.setEditingContentLesson}
      onChange={logic.setContentDraft}
      onSave={() => {
        void logic.handleSaveContent();
      }}
      isSaving={logic.isSaving}
      onImportLegacy={() => {
        if (logic.editingContentLesson) {
          void logic.handleImportLegacy(logic.editingContentLesson);
        }
      }}
      onClearContent={() => {
        void logic.handleClearContent();
      }}
    />
  );
}
