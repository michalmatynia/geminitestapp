'use client';

import { Plus, Trash2, X } from 'lucide-react';
import React, { useMemo } from 'react';

import {
  FormField,
  FormSection,
  SelectSimple,
  type SelectSimpleOption,
} from '@/shared/ui/forms-and-actions.public';
import { Button } from '@/shared/ui/primitives.public';

import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';
import { createClientFilemakerId } from '../../pages/filemaker-page-utils';
import { createFilemakerOrganizationLegacyDemand } from '../../settings';
import type {
  FilemakerOrganizationLegacyDemand,
  FilemakerValue,
} from '../../types';

const ROOT_PARENT_KEY = '__root__';
const DEMAND_LEVELS = [0, 1, 2, 3] as const;

const parentKey = (parentId: string | null | undefined): string => {
  const normalizedParentId = parentId?.trim() ?? '';
  return normalizedParentId.length > 0 ? normalizedParentId : ROOT_PARENT_KEY;
};

const compareValues = (left: FilemakerValue, right: FilemakerValue): number => {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  return left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
};

const getValueOptionDescription = (value: FilemakerValue): string | undefined => {
  if (value.value.length > 0 && value.value !== value.label) return value.value;
  return value.legacyUuid;
};

const toValueOption = (value: FilemakerValue): SelectSimpleOption => ({
  label: value.label,
  value: value.id,
  description: getValueOptionDescription(value),
});

const groupValueOptionsByParent = (
  values: FilemakerValue[]
): Map<string, SelectSimpleOption[]> => {
  const grouped = new Map<string, FilemakerValue[]>();
  values.forEach((value: FilemakerValue): void => {
    const key = parentKey(value.parentId);
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  });

  const optionsByParent = new Map<string, SelectSimpleOption[]>();
  grouped.forEach((groupValues: FilemakerValue[], key: string): void => {
    optionsByParent.set(key, groupValues.slice().sort(compareValues).map(toValueOption));
  });
  return optionsByParent;
};

const getLevelOptions = (
  optionsByParent: Map<string, SelectSimpleOption[]>,
  row: FilemakerOrganizationLegacyDemand,
  levelIndex: number
): SelectSimpleOption[] => {
  if (levelIndex === 0) return optionsByParent.get(ROOT_PARENT_KEY) ?? [];
  const parentValueId = row.valueIds[levelIndex - 1] ?? '';
  if (parentValueId.length === 0) return [];
  return optionsByParent.get(parentValueId) ?? [];
};

const createLegacyDemandRow = (
  organizationId: string
): FilemakerOrganizationLegacyDemand =>
  createFilemakerOrganizationLegacyDemand({
    id: createClientFilemakerId('organization-legacy-demand'),
    organizationId,
    valueIds: [],
  });

function LegacyDemandLevelSelect(props: {
  disabled: boolean;
  levelIndex: number;
  onClear: () => void;
  onValueChange: (valueId: string) => void;
  options: SelectSimpleOption[];
  value: string;
}): React.JSX.Element {
  const levelNumber = props.levelIndex + 1;
  const hasValue = props.value.trim().length > 0;

  return (
    <FormField label={`Level ${levelNumber}`}>
      <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
        <SelectSimple
          value={props.value}
          onValueChange={props.onValueChange}
          options={props.options}
          placeholder={`Level ${levelNumber}`}
          size='sm'
          disabled={props.disabled}
          ariaLabel={`Legacy Demand level ${levelNumber}`}
          title={`Legacy Demand level ${levelNumber}`}
        />
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-8 rounded-lg'
          onClick={props.onClear}
          disabled={!hasValue}
          aria-label={`Clear Legacy Demand level ${levelNumber}`}
          title={`Clear Legacy Demand level ${levelNumber}`}
        >
          <X className='size-3.5' />
        </Button>
      </div>
    </FormField>
  );
}

function LegacyDemandRow(props: {
  onRemove: () => void;
  onUpdateLevel: (levelIndex: number, valueId: string) => void;
  onClearLevel: (levelIndex: number) => void;
  optionsByParent: Map<string, SelectSimpleOption[]>;
  row: FilemakerOrganizationLegacyDemand;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 border-b border-border/50 pb-3 last:border-b-0 last:pb-0 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]'>
      {DEMAND_LEVELS.map((levelIndex: number) => {
        const options = getLevelOptions(props.optionsByParent, props.row, levelIndex);
        const parentValueId = props.row.valueIds[levelIndex - 1] ?? '';
        const missingParent = levelIndex > 0 && parentValueId.length === 0;
        return (
          <LegacyDemandLevelSelect
            key={levelIndex}
            levelIndex={levelIndex}
            value={props.row.valueIds[levelIndex] ?? ''}
            options={options}
            disabled={missingParent || options.length === 0}
            onValueChange={(valueId: string): void => props.onUpdateLevel(levelIndex, valueId)}
            onClear={(): void => props.onClearLevel(levelIndex)}
          />
        );
      })}
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='mt-auto size-8 rounded-lg'
        onClick={props.onRemove}
        aria-label='Remove Legacy Demand row'
        title='Remove Legacy Demand row'
      >
        <Trash2 className='size-3.5' />
      </Button>
    </div>
  );
}

function createLegacyDemandRowsController(
  organizationId: string,
  setLegacyDemandRows: React.Dispatch<
    React.SetStateAction<FilemakerOrganizationLegacyDemand[]>
  >
): {
  addRow: () => void;
  clearLevel: (rowId: string, levelIndex: number) => void;
  removeRow: (rowId: string) => void;
  updateLevel: (rowId: string, levelIndex: number, valueId: string) => void;
} {
  const addRow = (): void => {
    setLegacyDemandRows((current: FilemakerOrganizationLegacyDemand[]) => [
      ...current,
      createLegacyDemandRow(organizationId),
    ]);
  };
  const removeRow = (rowId: string): void => {
    setLegacyDemandRows((current: FilemakerOrganizationLegacyDemand[]) =>
      current.filter((row: FilemakerOrganizationLegacyDemand): boolean => row.id !== rowId)
    );
  };
  const updateLevel = (rowId: string, levelIndex: number, valueId: string): void => {
    setLegacyDemandRows((current: FilemakerOrganizationLegacyDemand[]) =>
      current.map((row: FilemakerOrganizationLegacyDemand): FilemakerOrganizationLegacyDemand => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          valueIds: [...row.valueIds.slice(0, levelIndex), valueId].slice(0, 4),
        };
      })
    );
  };
  const clearLevel = (rowId: string, levelIndex: number): void => {
    setLegacyDemandRows((current: FilemakerOrganizationLegacyDemand[]) =>
      current.map((row: FilemakerOrganizationLegacyDemand): FilemakerOrganizationLegacyDemand => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          valueIds: row.valueIds.slice(0, levelIndex),
        };
      })
    );
  };

  return { addRow, clearLevel, removeRow, updateLevel };
}

export function OrganizationLegacyDemandSection(): React.JSX.Element | null {
  const { legacyDemandRows, organization, valueCatalog } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const { setLegacyDemandRows } = useAdminFilemakerOrganizationEditPageActionsContext();
  const optionsByParent = useMemo(
    () => groupValueOptionsByParent(valueCatalog),
    [valueCatalog]
  );

  if (organization === null) return null;

  const { addRow, clearLevel, removeRow, updateLevel } = createLegacyDemandRowsController(
    organization.id,
    setLegacyDemandRows
  );

  return (
    <FormSection title='Legacy Demand' className='space-y-4 p-4'>
      <div className='space-y-3'>
        {legacyDemandRows.length === 0 ? (
          <div className='text-xs text-muted-foreground'>No legacy demand rows.</div>
        ) : (
          legacyDemandRows.map((row: FilemakerOrganizationLegacyDemand) => (
            <LegacyDemandRow
              key={row.id}
              row={row}
              optionsByParent={optionsByParent}
              onRemove={(): void => removeRow(row.id)}
              onUpdateLevel={(levelIndex: number, valueId: string): void =>
                updateLevel(row.id, levelIndex, valueId)
              }
              onClearLevel={(levelIndex: number): void => clearLevel(row.id, levelIndex)}
            />
          ))
        )}
      </div>
      <Button type='button' size='sm' variant='outline' onClick={addRow}>
        <Plus className='mr-1.5 size-3.5' />
        Add Demand
      </Button>
    </FormSection>
  );
}
