'use client';

import type React from 'react';

import { useToast } from '@/shared/ui/primitives.public';

import {
  useDraftCreatorFormContextValue,
  useDraftCreatorImageManagerController,
  useDraftCreatorProductImageContextValue,
} from './DraftCreator.context';
import { useDraftCreatorSave } from './DraftCreator.save';
import { DraftCreatorLoadingCard, DraftCreatorView } from './DraftCreator.view';
import {
  useOptionalDrafterActions,
  useOptionalDrafterState,
} from '../context/DrafterContext';
import { useDraftCreatorForm } from '../hooks/useDraftCreatorForm';

type DraftCreatorProps = {
  active?: boolean;
  draftId?: string | null;
  onActiveChange?: (value: boolean) => void;
  onCancel?: () => void;
  onSaveSuccess?: () => void;
};

const noop = (): void => {};
type OptionalDrafterState = ReturnType<typeof useOptionalDrafterState>;
type OptionalDrafterActions = ReturnType<typeof useOptionalDrafterActions>;

const resolveDraftId = (
  propDraftId: string | null | undefined,
  stateContext: OptionalDrafterState
): string | null => propDraftId ?? stateContext?.editingDraftId ?? null;

const resolveSaveSuccess = (
  propOnSaveSuccess: (() => void) | undefined,
  actionsContext: OptionalDrafterActions
): (() => void) => propOnSaveSuccess ?? actionsContext?.handleSaveSuccess ?? noop;

export function DraftCreator({
  draftId: propDraftId,
  onSaveSuccess: propOnSaveSuccess,
  active: propActive,
  onActiveChange,
}: DraftCreatorProps = {}): React.JSX.Element {
  const { toast } = useToast();
  const stateContext = useOptionalDrafterState();
  const actionsContext = useOptionalDrafterActions();

  const draftId = resolveDraftId(propDraftId, stateContext);
  const handleSaveSuccess = resolveSaveSuccess(propOnSaveSuccess, actionsContext);
  const formRef = stateContext?.formRef;

  const form = useDraftCreatorForm(draftId, handleSaveSuccess, propActive, onActiveChange);
  const handleSave = useDraftCreatorSave({ draftId, form, handleSaveSuccess, toast });
  const imageManagerController = useDraftCreatorImageManagerController(form.images);
  const productFormImageContextValue = useDraftCreatorProductImageContextValue(form.images);
  const contextValue = useDraftCreatorFormContextValue(form, imageManagerController);

  if (form.queries.draftQuery.isLoading) return <DraftCreatorLoadingCard />;

  return (
    <DraftCreatorView
      contextValue={contextValue}
      formRef={formRef}
      handleSave={handleSave}
      imageManagerController={imageManagerController}
      images={form.images}
      productFormImageContextValue={productFormImageContextValue}
      state={form.state}
    />
  );
}
