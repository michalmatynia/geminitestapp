'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { type SettingsPanelField } from '@/shared/ui/templates/SettingsPanelBuilder';

import {
  CaseResolverEntitySettingsModal,
  CaseResolverEntitySettingsModalProvider,
} from './CaseResolverEntitySettingsModal';

import type { CaseResolverCategory, CaseResolverIdentifier, CaseResolverTag } from '../../types';

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

const ROOT_CATEGORY_OPTION: LabeledOptionDto<string> = { value: '__root__', label: 'Root' };
const ROOT_IDENTIFIER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'No parent (root identifier)',
};
const ROOT_TAG_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'No parent (root tag)',
};

interface BaseCaseResolverEntityModalProps<
  TItem,
  TForm extends object,
> extends EntityModalProps<TItem> {
  formData: TForm;
  setFormData: React.Dispatch<React.SetStateAction<TForm>>;
  isSaving: boolean;
  onSave: () => void;
  fields: SettingsPanelField<TForm>[];
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
  parentOptions: Array<LabeledOptionDto<string>>;
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverCategoryModal(
  props: CaseResolverCategoryModalProps
): React.JSX.Element {
  const { parentOptions, isOpen, onClose, item, formData, setFormData, isSaving, onSave } = props;

  const parentCategoryOptions = useMemo(
    () => [ROOT_CATEGORY_OPTION, ...parentOptions],
    [parentOptions]
  );

  const fields: SettingsPanelField<CategoryFormData>[] = useMemo(
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
        options: parentCategoryOptions,
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
    [parentCategoryOptions]
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
  parentIdentifierOptions: Array<LabeledOptionDto<string>>;
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

  const identifierOptions = useMemo(
    () => [ROOT_IDENTIFIER_OPTION, ...parentIdentifierOptions],
    [parentIdentifierOptions]
  );

  const fields: SettingsPanelField<CaseIdentifierFormData>[] = useMemo(
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
        options: identifierOptions,
        placeholder: 'Select parent case identifier',
      },
    ],
    [identifierOptions]
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
  parentTagOptions: Array<LabeledOptionDto<string>>;
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverTagModal(props: CaseResolverTagModalProps): React.JSX.Element {
  const { parentTagOptions, isOpen, onClose, item, formData, setFormData, isSaving, onSave } =
    props;

  const tagOptions = useMemo(() => [ROOT_TAG_OPTION, ...parentTagOptions], [parentTagOptions]);

  const fields: SettingsPanelField<TagFormData>[] = useMemo(
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
        options: tagOptions,
        placeholder: 'Select parent tag',
      },
    ],
    [tagOptions]
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
