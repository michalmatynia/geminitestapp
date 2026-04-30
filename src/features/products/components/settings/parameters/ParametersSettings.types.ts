import type { Dispatch, SetStateAction } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type {
  ProductParameter,
  ProductParameterLinkedTitleTermType,
} from '@/shared/contracts/products/parameters';

export type ParametersSettingsProps = {
  loading: boolean;
  parameters: ProductParameter[];
  catalogs: CatalogRecord[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

export type ParameterSelectorType = ProductParameter['selectorType'];

export type ParameterFormData = {
  name_en: string;
  name_pl: string;
  name_de: string;
  catalogId: string;
  selectorType: ParameterSelectorType;
  optionLabelsInput: string;
  linkedTitleTermType: ProductParameterLinkedTitleTermType;
};

export type SelectAllChecked = boolean | 'indeterminate';

export type ParametersSettingsController = {
  loading: boolean;
  parameters: ProductParameter[];
  catalogs: CatalogRecord[];
  selectedCatalogId: string | null;
  selectedCatalogName: string | null;
  catalogOptions: Array<LabeledOptionDto<string>>;
  onCatalogChange: (catalogId: string) => void;
  hasVisibleParameters: boolean;
  selectAllChecked: SelectAllChecked;
  selectedCount: number;
  pendingDeleteCount: number;
  selectedParameterIds: Set<string>;
  deletePending: boolean;
  savePending: boolean;
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  editingParameter: ProductParameter | null;
  formData: ParameterFormData;
  setFormData: Dispatch<SetStateAction<ParameterFormData>>;
  selectorNeedsOptions: boolean;
  selectorSupportsLinking: boolean;
  updateSelection: (parameterId: string, checked: boolean) => void;
  handleToggleSelectAll: () => void;
  startDeleteSelection: () => void;
  startDeleteParameter: (parameter: ProductParameter) => void;
  clearPendingDeletion: () => void;
  handleConfirmDelete: () => Promise<void>;
  openCreateModal: () => void;
  openEditModal: (parameter: ProductParameter) => void;
  handleSave: () => Promise<void>;
};
