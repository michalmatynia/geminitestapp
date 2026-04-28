'use client';

import { BriefcaseBusiness, Copy } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { DropdownMenuItem } from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/button';
import { SelectionBar } from '@/shared/ui/selection-bar';
import { useToast } from '@/shared/ui/toast';

import type {
  OrganizationListState,
  OrganizationSelectionState,
} from '../../pages/AdminFilemakerOrganizationsPage.types';
import type { FilemakerOrganization } from '../../types';
import { FilemakerPracujScrapeModal } from './FilemakerPracujScrapeModal';

const selectedOrganizationIds = (selection: OrganizationSelectionState): string[] =>
  Object.keys(selection).filter((id: string): boolean => selection[id] === true);

function PracujScrapeAction(props: {
  onCompleted: () => void;
  selectedOrganizationCount: number;
  selectedOrganizationIds: string[];
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='gap-2'
        onClick={() => setIsOpen(true)}
      >
        <BriefcaseBusiness className='h-4 w-4' />
        Scrape pracuj.pl
      </Button>
      <FilemakerPracujScrapeModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onCompleted={props.onCompleted}
        selectedOrganizationCount={props.selectedOrganizationCount}
        selectedOrganizationIds={props.selectedOrganizationIds}
      />
    </>
  );
}

export function FilemakerOrganizationsSelectionActions(
  props: OrganizationListState
): React.JSX.Element {
  const { toast } = useToast();
  const selectedIds = useMemo(
    () => selectedOrganizationIds(props.organizationSelection),
    [props.organizationSelection]
  );
  const copySelectedIds = useCallback(async (): Promise<void> => {
    if (selectedIds.length === 0) {
      toast('Please select organisations to copy.', { variant: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedIds.join('\n'));
      toast(`Copied ${selectedIds.length} organisation ID${selectedIds.length === 1 ? '' : 's'}.`, {
        variant: 'success',
      });
    } catch {
      toast('Failed to copy selected organisation IDs.', { variant: 'error' });
    }
  }, [selectedIds, toast]);

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
      rightActions={
        <PracujScrapeAction
          onCompleted={props.onPracujScrapeCompleted}
          selectedOrganizationCount={props.selectedOrganizationCount}
          selectedOrganizationIds={selectedIds}
        />
      }
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
