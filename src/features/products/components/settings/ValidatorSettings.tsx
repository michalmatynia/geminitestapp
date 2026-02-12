'use client';

import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/types/domain/products';
import { ConfirmDialog } from '@/shared/ui';

import { useValidatorSettingsController } from './validator-settings/useValidatorSettingsController';
import { ValidatorDefaultPanel } from './validator-settings/ValidatorDefaultPanel';
import { ValidatorInstanceBehaviorPanel } from './validator-settings/ValidatorInstanceBehaviorPanel';
import { ValidatorPatternModal } from './validator-settings/ValidatorPatternModal';
import { ValidatorPatternTablePanel } from './validator-settings/ValidatorPatternTablePanel';

import type { DragEvent } from 'react';

export function ValidatorSettings(): React.JSX.Element {
  const controller = useValidatorSettingsController();

  return (
    <div className='space-y-5'>
      <ValidatorDefaultPanel
        enabledByDefault={controller.enabledByDefault}
        disabled={controller.settingsBusy}
        onToggle={() => {
          void controller.handleToggleDefault();
        }}
      />

      <ValidatorInstanceBehaviorPanel
        instanceDenyBehavior={controller.instanceDenyBehavior}
        disabled={controller.settingsBusy}
        onScopeChange={(
          scope: ProductValidationInstanceScope,
          value: ProductValidationDenyBehavior
        ): void => {
          void controller.handleInstanceBehaviorChange(scope, value);
        }}
      />

      <ValidatorPatternTablePanel
        summary={controller.summary}
        loading={controller.loading}
        patterns={controller.patterns}
        orderedPatterns={controller.orderedPatterns}
        patternActionsPending={controller.patternActionsPending}
        reorderPending={controller.reorderPending}
        createPatternPending={controller.createPatternPending}
        updatePatternPending={controller.updatePatternPending}
        draggedPatternId={controller.draggedPatternId}
        dragOverPatternId={controller.dragOverPatternId}
        setDraggedPatternId={controller.setDraggedPatternId}
        setDragOverPatternId={controller.setDragOverPatternId}
        sequenceGroups={controller.sequenceGroups}
        firstPatternIdByGroup={controller.firstPatternIdByGroup}
        getGroupDraft={controller.getGroupDraft}
        setGroupDrafts={controller.setGroupDrafts}
        getSequenceGroupId={controller.getSequenceGroupId}
        formatReplacementFields={controller.formatReplacementFields}
        openCreate={controller.openCreate}
        onCreateSkuAutoIncrementSequence={() => {
          void controller.handleCreateSkuAutoIncrementSequence();
        }}
        onCreateLatestPriceStockSequence={() => {
          void controller.handleCreateLatestPriceStockSequence();
        }}
        onCreateNameLengthMirrorPattern={() => {
          void controller.handleCreateNameLengthMirrorPattern();
        }}
        onCreateNameCategoryMirrorPattern={() => {
          void controller.handleCreateNameCategoryMirrorPattern();
        }}
        onCreateNameMirrorPolishSequence={() => {
          void controller.handleCreateNameMirrorPolishSequence();
        }}
        onSaveSequenceGroup={(groupId: string) => {
          void controller.handleSaveSequenceGroup(groupId);
        }}
        onUngroup={(groupId: string) => {
          void controller.handleUngroup(groupId);
        }}
        onPatternDrop={(
          pattern: ProductValidationPattern,
          event: DragEvent<HTMLDivElement>
        ) => {
          void controller.handlePatternDrop(pattern, event);
        }}
        onTogglePattern={(pattern: ProductValidationPattern) => {
          void controller.handleTogglePattern(pattern);
        }}
        onDuplicatePattern={(pattern: ProductValidationPattern) => {
          void controller.handleDuplicatePattern(pattern);
        }}
        onEditPattern={controller.openEdit}
        onDeletePattern={controller.setPatternToDelete}
      />

      <ConfirmDialog
        open={!!controller.patternToDelete}
        onOpenChange={(open: boolean) => {
          if (!open) controller.setPatternToDelete(null);
        }}
        onConfirm={() => {
          void controller.handleDelete();
        }}
        title='Delete Pattern'
        description={`Delete validator pattern "${controller.patternToDelete?.label}"? This cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
      />

      <ValidatorPatternModal
        showModal={controller.showModal}
        editingPattern={controller.editingPattern}
        formData={controller.formData}
        setFormData={controller.setFormData}
        replacementFieldOptions={controller.replacementFieldOptions}
        sourceFieldOptions={controller.sourceFieldOptions}
        createPatternPending={controller.createPatternPending}
        updatePatternPending={controller.updatePatternPending}
        onClose={controller.closeModal}
        onSave={() => {
          void controller.handleSave();
        }}
        isLocaleTarget={controller.isLocaleTarget}
        getReplacementFieldsForTarget={controller.getReplacementFieldsForTarget}
        getSourceFieldOptionsForTarget={controller.getSourceFieldOptionsForTarget}
        normalizeReplacementFields={controller.normalizeReplacementFields}
      />
    </div>
  );
}
