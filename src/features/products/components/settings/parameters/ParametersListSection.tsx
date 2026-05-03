import { Plus } from 'lucide-react';

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { FormSection } from '@/shared/ui/form-section';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';

import type { SelectAllChecked } from './ParametersSettings.types';
import { getLinkedTitleTermLabel, getSelectorTypeLabel } from './ParametersSettings.utils';

type ParametersListSectionProps = {
  loading: boolean;
  parameters: ProductParameter[];
  selectedCatalogName: string | null;
  hasVisibleParameters: boolean;
  selectAllChecked: SelectAllChecked;
  selectedCount: number;
  selectedParameterIds: Set<string>;
  deletePending: boolean;
  openCreateModal: () => void;
  openEditModal: (parameter: ProductParameter) => void;
  handleToggleSelectAll: () => void;
  updateSelection: (parameterId: string, checked: boolean) => void;
  startDeleteSelection: () => void;
  startDeleteParameter: (parameter: ProductParameter) => void;
};

type ParametersBulkActionsProps = Pick<
  ParametersListSectionProps,
  | 'hasVisibleParameters'
  | 'selectAllChecked'
  | 'selectedCount'
  | 'deletePending'
  | 'loading'
  | 'handleToggleSelectAll'
  | 'startDeleteSelection'
>;

type ParametersListBodyProps = Pick<
  ParametersListSectionProps,
  | 'loading'
  | 'parameters'
  | 'selectedParameterIds'
  | 'openEditModal'
  | 'updateSelection'
  | 'startDeleteParameter'
>;

const renderParameterDescription = (parameter: ProductParameter): React.JSX.Element => (
  <div className='flex flex-wrap gap-x-3 gap-y-1'>
    {parameter.optionLabels.length > 0 && <span>Options: {parameter.optionLabels.length}</span>}
    {parameter.linkedTitleTermType !== null && (
      <span>Synced: {getLinkedTitleTermLabel(parameter.linkedTitleTermType)}</span>
    )}
    {parameter.name_pl !== null && parameter.name_pl.length > 0 && <span>PL: {parameter.name_pl}</span>}
    {parameter.name_de !== null && parameter.name_de.length > 0 && <span>DE: {parameter.name_de}</span>}
  </div>
);

function ParametersBulkActions({
  hasVisibleParameters,
  selectAllChecked,
  selectedCount,
  deletePending,
  handleToggleSelectAll,
  startDeleteSelection,
  loading,
}: ParametersBulkActionsProps): React.JSX.Element {
  return (
    <div className='mb-4 flex items-center justify-between gap-3'>
      <div className='flex items-center gap-2 text-sm text-gray-300'>
        <Checkbox
          checked={selectAllChecked}
          onCheckedChange={handleToggleSelectAll}
          disabled={!hasVisibleParameters || loading}
          aria-label='Select all parameters'
          title='Select all parameters'
        />
        <span>Select all</span>
      </div>
      <Button
        size='sm'
        onClick={startDeleteSelection}
        disabled={selectedCount === 0 || deletePending || loading}
        variant='destructive'
        className='gap-2'
      >
        {deletePending ? 'Deleting...' : `Delete Selected (${selectedCount})`}
      </Button>
    </div>
  );
}

function ParametersListBody({
  loading,
  parameters,
  selectedParameterIds,
  openEditModal,
  updateSelection,
  startDeleteParameter,
}: ParametersListBodyProps): React.JSX.Element {
  return (
    <SimpleSettingsList
      items={parameters.map((parameter) => ({
        id: parameter.id,
        title: parameter.name_en,
        subtitle: `Type: ${getSelectorTypeLabel(parameter.selectorType)}`,
        description: renderParameterDescription(parameter),
        original: parameter,
      }))}
      isLoading={loading}
      onEdit={(item) => openEditModal(item.original)}
      renderActions={(item) => (
        <Checkbox
          checked={selectedParameterIds.has(item.id)}
          onCheckedChange={(checked) => {
            updateSelection(item.id, checked === true);
          }}
          aria-label={`Select parameter ${item.title}`}
          title={`Select parameter ${item.title}`}
        />
      )}
      onDelete={(item) => {
        startDeleteParameter(item.original);
      }}
      emptyMessage='No parameters yet. Create product parameters and choose their selector type.'
    />
  );
}

export function ParametersListSection(props: ParametersListSectionProps): React.JSX.Element {
  return (
    <>
      <div className='flex justify-start'>
        <Button onClick={props.openCreateModal} className='bg-white text-gray-900 hover:bg-gray-200'>
          <Plus className='size-4 mr-2' />
          Add Parameter
        </Button>
      </div>

      <FormSection
        title={`Parameters for "${props.selectedCatalogName ?? 'selected catalog'}"`}
        className='p-4'
      >
        <div className='mt-4'>
          <ParametersBulkActions {...props} />
          <ParametersListBody {...props} />
        </div>
      </FormSection>
    </>
  );
}
