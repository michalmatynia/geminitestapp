'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

export interface CaseResolverEntitySettingsModalRuntimeValue<TItem, TForm extends object> {
  isOpen: boolean | undefined;
  onClose: () => void;
  item: TItem | null | undefined;
  formData: TForm;
  setFormData: React.Dispatch<React.SetStateAction<TForm>>;
  fields: SettingsField<TForm>[];
  isSaving: boolean;
  onSave: () => void;
  createTitle: string;
  editTitle: string;
  parentNullSentinel?: string;
}

type CaseResolverEntitySettingsModalRuntimeAny = CaseResolverEntitySettingsModalRuntimeValue<
  unknown,
  Record<string, unknown>
>;

export const {
  Context: CaseResolverEntitySettingsModalRuntimeContext,
  useStrictContext: useCaseResolverEntitySettingsModalRuntime,
} = createStrictContext<CaseResolverEntitySettingsModalRuntimeAny>({
  hookName: 'useCaseResolverEntitySettingsModalRuntime',
  providerName: 'CaseResolverEntitySettingsModalProvider',
  displayName: 'CaseResolverEntitySettingsModalRuntimeContext',
});

interface CaseResolverEntitySettingsModalProviderProps<TItem, TForm extends object> {
  value: CaseResolverEntitySettingsModalRuntimeValue<TItem, TForm>;
  children: React.ReactNode;
}

export function CaseResolverEntitySettingsModalProvider<TItem, TForm extends object>({
  value,
  children,
}: CaseResolverEntitySettingsModalProviderProps<TItem, TForm>): React.JSX.Element {
  return (
    <CaseResolverEntitySettingsModalRuntimeContext.Provider
      value={value as CaseResolverEntitySettingsModalRuntimeAny}
    >
      {children}
    </CaseResolverEntitySettingsModalRuntimeContext.Provider>
  );
}

export function CaseResolverEntitySettingsModal(): React.JSX.Element {
  const {
    isOpen,
    onClose,
    item,
    isSaving,
    onSave,
    createTitle,
    editTitle,
    parentNullSentinel,
    formData: runtimeFormData,
    setFormData: runtimeSetFormData,
    fields: runtimeFields,
  } = useCaseResolverEntitySettingsModalRuntime();

  const formData = runtimeFormData;
  const setFormData = runtimeSetFormData;
  const fields = runtimeFields;

  const handleChange = (vals: Partial<Record<string, unknown>>) => {
    setFormData((prev) => {
      const next = { ...prev, ...vals };
      if (!parentNullSentinel) return next;

      const changedParentId = (vals as { parentId?: unknown }).parentId;
      if (changedParentId !== parentNullSentinel) return next;

      return {
        ...next,
        parentId: null,
      };
    });
  };

  return (
    <SettingsPanelBuilder
      open={Boolean(isOpen)}
      onClose={onClose}
      title={item ? editTitle : createTitle}
      fields={fields}
      values={formData}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
      size='md'
    />
  );
}
