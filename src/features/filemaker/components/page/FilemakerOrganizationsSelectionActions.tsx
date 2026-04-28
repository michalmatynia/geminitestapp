'use client';

import { Copy } from 'lucide-react';
import React, { useCallback } from 'react';

import { DropdownMenuItem } from '@/shared/ui/dropdown-menu';
import { SelectionBar } from '@/shared/ui/selection-bar';
import { useToast } from '@/shared/ui/toast';

import type {
  OrganizationListState,
  OrganizationSelectionState,
} from '../../pages/AdminFilemakerOrganizationsPage.types';
import type { FilemakerOrganization } from '../../types';

const selectedOrganizationIds = (selection: OrganizationSelectionState): string[] =>
  Object.keys(selection).filter((id: string): boolean => selection[id] === true);

export function FilemakerOrganizationsSelectionActions(
  props: OrganizationListState
): React.JSX.Element {
  const { toast } = useToast();
  const copySelectedIds = useCallback(async (): Promise<void> => {
    const ids = selectedOrganizationIds(props.organizationSelection);
    if (ids.length === 0) {
      toast('Please select organisations to copy.', { variant: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(ids.join('\n'));
      toast(`Copied ${ids.length} organisation ID${ids.length === 1 ? '' : 's'}.`, {
        variant: 'success',
      });
    } catch {
      toast('Failed to copy selected organisation IDs.', { variant: 'error' });
    }
  }, [props.organizationSelection, toast]);

  return (
    <SelectionBar<FilemakerOrganization>
      data={props.organizations}
      getRowId={(organization: FilemakerOrganization): string => organization.id}
      selectedCount={props.selectedOrganizationCount}
      onSelectPage={props.onSelectOrganizationsPage}
      onDeselectPage={props.onDeselectOrganizationsPage}
      onDeselectAll={props.onDeselectAllOrganizations}
      onSelectAllGlobal={props.onSelectAllOrganizations}
      loadingGlobal={props.isSelectingAllOrganizations}
      className='border-t pt-3'
      label='Organisations'
      actions={
        <DropdownMenuItem
          onClick={() => {
            void copySelectedIds();
          }}
          className='cursor-pointer gap-2'
          disabled={props.selectedOrganizationCount === 0}
        >
          <Copy className='h-4 w-4' />
          Copy selected IDs
        </DropdownMenuItem>
      }
    />
  );
}
