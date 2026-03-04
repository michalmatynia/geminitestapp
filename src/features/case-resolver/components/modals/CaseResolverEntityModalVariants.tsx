'use client';

import React, { useMemo } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { CaseResolverCategory, CaseResolverIdentifier, CaseResolverTag } from '../../types';
import {
  CaseResolverEntitySettingsModal,
  CaseResolverEntitySettingsModalProvider,
} from './CaseResolverEntitySettingsModal';

type CategoryFormData = {
  name: string;
  description: string;
  color: string;
  parentId: string | null;
};

type CaseIdentifierFormData = {
  name: string;
  color: string;
  parentId: string | null;
};

type TagFormData = {
  name: string;
  color: string;
  parentId: string | null;
};

interface BaseCaseResolverEntityModalProps<TItem, TForm extends object> extends EntityModalProps<TItem> {
  formData: TForm;
  setFormData: React.Dispatch<React.SetStateAction<TForm>>;
  isSaving: boolean;
  onSave: () => void;
  fields: SettingsField<TForm>[];
  createTitle: string;
  editTitle: string;
  parentNullSentinel?: string;
}

function CaseResolverConfiguredEntityModal<TItem, TForm extends object>({
  isOpen,
  onClose,
  item,
  formData,
  setFormData,
  isSaving,
  onSave,
  fields,
  createTitle,
  editTitle,
  parentNullSentinel,
}: BaseCaseResolverEntityModalProps<TItem, TForm>): React.JSX.Element {
  const runtimeValue = useMemo(
    () => ({
      isOpen,
      onClose,
      item,
      createTitle,
      editTitle,
      fields,
      formData,
      setFormData,
      onSave,
      isSaving,
      parentNullSentinel,
    }),
    [
      createTitle,
      editTitle,
      fields,
      formData,
      isOpen,
      isSaving,
      item,
      onClose,
      onSave,
      parentNullSentinel,
      setFormData,
    ]
  );

  return (
    <CaseResolverEntitySettingsModalProvider value={runtimeValue}>
      <CaseResolverEntitySettingsModal />
    </CaseResolverEntitySettingsModalProvider>
  );
}

interface CaseResolverCategoryModalProps extends EntityModalProps<CaseResolverCategory> {
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  parentOptions: { value: string; label: string }[];
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverCategoryModal(props: CaseResolverCategoryModalProps): React.JSX.Element {
  const { parentOptions, isOpen, onClose, item, formData, setFormData, isSaving, onSave } = props;

  const fields: SettingsField<CategoryFormData>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'Category name',
        required: true,
      },
      {
        key: 'parentId',
        label: 'Parent Category',
        type: 'select',
        options: [{ value: '__root__', label: 'Root' }, ...parentOptions],
        placeholder: 'Root',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Optional description',
      },
      {
        key: 'color',
        label: 'Color',
        type: 'color',
        required: true,
      },
    ],
    [parentOptions]
  );

  return (
    <CaseResolverConfiguredEntityModal
      isOpen={isOpen}
      onClose={onClose}
      item={item}
      formData={formData}
      setFormData={setFormData}
      isSaving={isSaving}
      onSave={onSave}
      fields={fields}
      createTitle='Create Category'
      editTitle='Edit Category'
      parentNullSentinel='__root__'
    />
  );
}

interface CaseResolverIdentifierModalProps extends EntityModalProps<CaseResolverIdentifier> {
  formData: CaseIdentifierFormData;
  setFormData: React.Dispatch<React.SetStateAction<CaseIdentifierFormData>>;
  parentIdentifierOptions: { value: string; label: string }[];
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverIdentifierModal(
  props: CaseResolverIdentifierModalProps
): React.JSX.Element {
  const {
    parentIdentifierOptions,
    isOpen,
    onClose,
    item,
    formData,
    setFormData,
    isSaving,
    onSave,
  } = props;

  const fields: SettingsField<CaseIdentifierFormData>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'Case identifier name',
        required: true,
      },
      {
        key: 'color',
        label: 'Color',
        type: 'color',
        required: true,
      },
      {
        key: 'parentId',
        label: 'Parent Case Identifier',
        type: 'select',
        options: [{ value: '__none__', label: 'No parent (root identifier)' }, ...parentIdentifierOptions],
        placeholder: 'Select parent case identifier',
      },
    ],
    [parentIdentifierOptions]
  );

  return (
    <CaseResolverConfiguredEntityModal
      isOpen={isOpen}
      onClose={onClose}
      item={item}
      formData={formData}
      setFormData={setFormData}
      isSaving={isSaving}
      onSave={onSave}
      fields={fields}
      createTitle='Create Case Identifier'
      editTitle='Edit Case Identifier'
      parentNullSentinel='__none__'
    />
  );
}

interface CaseResolverTagModalProps extends EntityModalProps<CaseResolverTag> {
  formData: TagFormData;
  setFormData: React.Dispatch<React.SetStateAction<TagFormData>>;
  parentTagOptions: { value: string; label: string }[];
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverTagModal(props: CaseResolverTagModalProps): React.JSX.Element {
  const { parentTagOptions, isOpen, onClose, item, formData, setFormData, isSaving, onSave } =
    props;

  const fields: SettingsField<TagFormData>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'Tag name',
        required: true,
      },
      {
        key: 'color',
        label: 'Color',
        type: 'color',
        required: true,
      },
      {
        key: 'parentId',
        label: 'Parent Tag',
        type: 'select',
        options: [{ value: '__none__', label: 'No parent (root tag)' }, ...parentTagOptions],
        placeholder: 'Select parent tag',
      },
    ],
    [parentTagOptions]
  );

  return (
    <CaseResolverConfiguredEntityModal
      isOpen={isOpen}
      onClose={onClose}
      item={item}
      formData={formData}
      setFormData={setFormData}
      isSaving={isSaving}
      onSave={onSave}
      fields={fields}
      createTitle='Create Tag'
      editTitle='Edit Tag'
      parentNullSentinel='__none__'
    />
  );
}
