'use client';
/* eslint-disable complexity, max-lines, max-lines-per-function */

import {
  BriefcaseBusiness,
  Copy as CopyIcon,
  Download,
  FileUp,
  Pencil,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';

import {
  organizationAdvancedFilterGroupSchema,
  type OrganizationAdvancedFilterGroup,
  type OrganizationAdvancedFilterPreset,
} from '../../filemaker-organization-advanced-filters';
import type {
  OrganizationListState,
  OrganizationSelectionState,
} from '../../pages/AdminFilemakerOrganizationsPage.types';
import type { FilemakerOrganization } from '../../types';
import { ActionMenu } from '@/shared/ui/ActionMenu';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { SelectionBar } from '@/shared/ui/selection-bar';
import { JSONImportModal } from '@/shared/ui/templates/modals/JSONImportModal';
import { useToast } from '@/shared/ui/toast';

import { FilemakerJobBoardScrapeModal } from './FilemakerJobBoardScrapeModal';
import { OrganizationAdvancedFilterBuilder } from './OrganizationAdvancedFilterBuilder';
import {
  buildOrganizationPresetBundle,
  createOrganizationAdvancedPreset,
  downloadOrganizationJsonFile,
  findOrganizationPresetById,
  hasOrganizationPresetNameConflict,
  cloneOrganizationAdvancedFilterGroup,
  mapImportedOrganizationPresets,
  normalizeOrganizationPresetName,
  parseOrganizationAdvancedFilterPayload,
  parseOrganizationPresetImportPayload,
  slugifyOrganizationPresetFilename,
  writeOrganizationTextToClipboard,
} from './organization-advanced-filter-utils';

const selectedOrganizationIds = (selection: OrganizationSelectionState): string[] =>
  Object.keys(selection).filter((id: string): boolean => selection[id] === true);

type OrganizationFilterPresetActionsProps = Omit<
  OrganizationListState,
  'activeAdvancedFilterPresetId' | 'advancedFilterPresets'
> & {
  activeAdvancedFilterPresetId?: string | null;
  advancedFilterPresets?: OrganizationAdvancedFilterPreset[];
};

function JobBoardScrapeAction(props: {
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
        onClick={(): void => setIsOpen(true)}
      >
        <BriefcaseBusiness className='h-4 w-4' />
        Scrape jobs
      </Button>
      <FilemakerJobBoardScrapeModal
        open={isOpen}
        onClose={(): void => setIsOpen(false)}
        onCompleted={props.onCompleted}
        selectedOrganizationCount={props.selectedOrganizationCount}
        selectedOrganizationIds={props.selectedOrganizationIds}
      />
    </>
  );
}

function OrganizationFilterPresetActions(
  props: OrganizationFilterPresetActionsProps
): React.JSX.Element {
  const { toast } = useToast();
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const activeAdvancedFilterPresetId = props.activeAdvancedFilterPresetId ?? null;
  const advancedFilterPresets = props.advancedFilterPresets ?? [];
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [presetDialogMode, setPresetDialogMode] = useState<'create' | 'edit'>('create');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetFilterDraft, setPresetFilterDraft] =
    useState<OrganizationAdvancedFilterGroup | null>(null);
  const [savingPreset, setSavingPreset] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importingPresets, setImportingPresets] = useState(false);
  const currentAdvancedFilterGroup = useMemo(
    () => parseOrganizationAdvancedFilterPayload(props.filters.advancedFilter),
    [props.filters.advancedFilter]
  );
  const activePreset = useMemo(() => {
    if (activeAdvancedFilterPresetId === null) return null;
    return findOrganizationPresetById(advancedFilterPresets, activeAdvancedFilterPresetId);
  }, [activeAdvancedFilterPresetId, advancedFilterPresets]);
  const presetDialogSubmitLabel = useMemo((): string => {
    if (savingPreset) return 'Saving...';
    if (presetDialogMode === 'edit') return 'Update Preset';
    return 'Save Preset';
  }, [presetDialogMode, savingPreset]);

  const closePresetDialog = (): void => {
    setIsPresetDialogOpen(false);
    setEditingPresetId(null);
    setPresetName('');
    setPresetFilterDraft(null);
    setSavingPreset(false);
  };

  const openCreatePresetDialog = (): void => {
    if (currentAdvancedFilterGroup === null) {
      toast('Apply an advanced filter before saving a preset.', { variant: 'error' });
      return;
    }
    setPresetDialogMode('create');
    setEditingPresetId(null);
    setPresetName('');
    setPresetFilterDraft(null);
    setIsPresetDialogOpen(true);
  };

  const openEditPresetDialog = (preset: OrganizationAdvancedFilterPreset): void => {
    setPresetDialogMode('edit');
    setEditingPresetId(preset.id);
    setPresetName(preset.name);
    setPresetFilterDraft(cloneOrganizationAdvancedFilterGroup(preset.filter));
    setIsPresetDialogOpen(true);
  };

  const applyPreset = useCallback(
    (preset: OrganizationAdvancedFilterPreset, notify = true): void => {
      props.onSetAdvancedFilterState(JSON.stringify(preset.filter), preset.id);
      if (notify) toast(`Applied preset "${preset.name}".`, { variant: 'success' });
    },
    [props, toast]
  );

  const deletePreset = useCallback(
    async (preset: OrganizationAdvancedFilterPreset): Promise<void> => {
      try {
        const nextPresets = advancedFilterPresets.filter(
          (entry: OrganizationAdvancedFilterPreset): boolean => entry.id !== preset.id
        );
        await props.onSetAdvancedFilterPresets(nextPresets);
        if (activeAdvancedFilterPresetId === preset.id) {
          props.onSetAdvancedFilterState('', null);
        }
        toast(`Deleted preset "${preset.name}".`, { variant: 'success' });
      } catch {
        toast('Failed to delete preset.', { variant: 'error' });
      }
    },
    [activeAdvancedFilterPresetId, advancedFilterPresets, props, toast]
  );

  const importPresets = useCallback(
    async (payload: unknown): Promise<void> => {
      const parsedPresets = parseOrganizationPresetImportPayload(payload);
      if (parsedPresets === null || parsedPresets.length === 0) {
        throw new Error(
          'Invalid preset payload. Provide a preset object, preset list, or bundle JSON.'
        );
      }
      const importedPresets = mapImportedOrganizationPresets(
        advancedFilterPresets,
        parsedPresets
      );
      await props.onSetAdvancedFilterPresets([
        ...advancedFilterPresets,
        ...importedPresets,
      ]);
      toast(`Imported ${importedPresets.length} preset(s).`, { variant: 'success' });
    },
    [advancedFilterPresets, props, toast]
  );

  const handleExportAllPresets = (): void => {
    if (advancedFilterPresets.length === 0) {
      toast('No presets to export.', { variant: 'error' });
      return;
    }
    downloadOrganizationJsonFile(
      'organization-advanced-filter-presets.bundle.json',
      buildOrganizationPresetBundle(advancedFilterPresets)
    );
  };

  const handleCopyAllPresets = async (): Promise<void> => {
    if (advancedFilterPresets.length === 0) {
      toast('No presets to copy.', { variant: 'error' });
      return;
    }
    try {
      await writeOrganizationTextToClipboard(
        JSON.stringify(buildOrganizationPresetBundle(advancedFilterPresets), null, 2)
      );
      toast('Copied all presets JSON to clipboard.', { variant: 'success' });
    } catch {
      toast('Failed to copy presets JSON.', { variant: 'error' });
    }
  };

  const handleCopyPreset = async (preset: OrganizationAdvancedFilterPreset): Promise<void> => {
    try {
      await writeOrganizationTextToClipboard(JSON.stringify(preset, null, 2));
      toast(`Copied preset "${preset.name}" JSON to clipboard.`, { variant: 'success' });
    } catch {
      toast('Failed to copy preset JSON.', { variant: 'error' });
    }
  };

  const handleImportFromDialog = async (value: string): Promise<void> => {
    if (value.trim().length === 0) {
      toast('Paste JSON to import.', { variant: 'error' });
      return;
    }
    try {
      setImportingPresets(true);
      const parsedPayload: unknown = JSON.parse(value);
      await importPresets(parsedPayload);
      setIsImportDialogOpen(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to import presets.', {
        variant: 'error',
      });
    } finally {
      setImportingPresets(false);
    }
  };

  const handleImportFromFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (file === undefined) return;
      try {
        const parsedPayload: unknown = JSON.parse(await file.text());
        await importPresets(parsedPayload);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to import presets from file.', {
          variant: 'error',
        });
      } finally {
        input.value = '';
      }
    },
    [importPresets, toast]
  );

  const savePresetDialog = async (): Promise<void> => {
    const trimmedName = normalizeOrganizationPresetName(presetName);
    if (trimmedName.length === 0) {
      toast('Preset name is required.', { variant: 'error' });
      return;
    }
    try {
      setSavingPreset(true);
      if (presetDialogMode === 'create') {
        if (currentAdvancedFilterGroup === null) {
          toast('Current advanced filter is invalid.', { variant: 'error' });
          return;
        }
        if (hasOrganizationPresetNameConflict(advancedFilterPresets, trimmedName)) {
          toast('Preset name already exists. Choose a unique name.', { variant: 'error' });
          return;
        }
        const preset = createOrganizationAdvancedPreset(trimmedName, currentAdvancedFilterGroup);
        await props.onSetAdvancedFilterPresets([...advancedFilterPresets, preset]);
        toast(`Saved preset "${trimmedName}".`, { variant: 'success' });
      } else {
        if (editingPresetId === null || presetFilterDraft === null) {
          toast('Preset to edit was not found.', { variant: 'error' });
          return;
        }
        if (
          hasOrganizationPresetNameConflict(
            advancedFilterPresets,
            trimmedName,
            editingPresetId
          )
        ) {
          toast('Preset name already exists. Choose a unique name.', { variant: 'error' });
          return;
        }
        const parsedFilter = organizationAdvancedFilterGroupSchema.safeParse(presetFilterDraft);
        if (!parsedFilter.success) {
          toast(parsedFilter.error.issues[0]?.message ?? 'Preset filter has invalid rules.', {
            variant: 'error',
          });
          return;
        }
        const now = new Date().toISOString();
        const nextPresets = advancedFilterPresets.map(
          (preset: OrganizationAdvancedFilterPreset): OrganizationAdvancedFilterPreset =>
            preset.id === editingPresetId
              ? { ...preset, filter: parsedFilter.data, name: trimmedName, updatedAt: now }
              : preset
        );
        await props.onSetAdvancedFilterPresets(nextPresets);
        if (activeAdvancedFilterPresetId === editingPresetId) {
          props.onSetAdvancedFilterState(JSON.stringify(parsedFilter.data), editingPresetId);
        }
        toast(`Updated preset "${trimmedName}".`, { variant: 'success' });
      }
      closePresetDialog();
    } catch {
      toast('Failed to save preset.', { variant: 'error' });
    } finally {
      setSavingPreset(false);
    }
  };

  return (
    <>
      {activePreset !== null ? (
        <Chip
          label={activePreset.name}
          active
          onClick={(): void => props.onSetAdvancedFilterState('', null)}
          icon={X}
          className='h-8 max-w-[240px] w-full sm:w-auto'
        />
      ) : null}
      <ActionMenu
        triggerId='organization-filter-presets-menu'
        align='end'
        className='w-80 max-w-[calc(100vw-2rem)]'
        trigger={
          <div className='flex items-center gap-2'>
            <SlidersHorizontal className='h-3.5 w-3.5' />
            <span className='text-xs font-medium'>Filter Presets</span>
          </div>
        }
        triggerClassName='h-8 w-full px-3 border border-border/60 bg-card/30 hover:bg-card/50 text-gray-300 hover:text-white sm:w-auto'
        variant='outline'
        size='sm'
      >
        <DropdownMenuLabel>Advanced Filter Presets</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={openCreatePresetDialog}
          disabled={currentAdvancedFilterGroup === null}
          className='cursor-pointer gap-2'
        >
          <Save className='h-4 w-4' />
          Save Current Filter
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportAllPresets}
          disabled={advancedFilterPresets.length === 0}
          className='cursor-pointer gap-2'
        >
          <Download className='h-4 w-4' />
          Export All Presets
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(): void => {
            void handleCopyAllPresets();
          }}
          disabled={advancedFilterPresets.length === 0}
          className='cursor-pointer gap-2'
        >
          <CopyIcon className='h-4 w-4' />
          Copy All Presets JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(): void => setIsImportDialogOpen(true)}
          className='cursor-pointer gap-2'
        >
          <Upload className='h-4 w-4' />
          Import From Pasted JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(): void => importFileInputRef.current?.click()}
          className='cursor-pointer gap-2'
        >
          <FileUp className='h-4 w-4' />
          Import From File
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {advancedFilterPresets.length === 0 ? (
          <DropdownMenuItem disabled>No presets saved</DropdownMenuItem>
        ) : (
          advancedFilterPresets.map((preset: OrganizationAdvancedFilterPreset) => (
            <div
              key={preset.id}
              role='group'
              aria-label={`Organisation preset ${preset.name}`}
              className='flex items-center gap-1 rounded-sm px-1 py-0.5'
            >
              <DropdownMenuItem
                onClick={(): void => applyPreset(preset)}
                className='min-w-0 flex-1 cursor-pointer gap-2 px-2'
                title={`Apply preset ${preset.name}`}
              >
                <span className='truncate'>{preset.name}</span>
                {activeAdvancedFilterPresetId === preset.id ? (
                  <span className='ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary'>
                    Applied
                  </span>
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                aria-label={`Export preset ${preset.name}`}
                title='Export JSON'
                onClick={(): void =>
                  downloadOrganizationJsonFile(
                    `organization-advanced-filter-preset-${slugifyOrganizationPresetFilename(
                      preset.name
                    )}.json`,
                    preset
                  )
                }
                className='h-8 w-8 cursor-pointer justify-center p-0'
              >
                <Download className='h-3.5 w-3.5' aria-hidden='true' />
              </DropdownMenuItem>
              <DropdownMenuItem
                aria-label={`Copy preset ${preset.name}`}
                title='Copy JSON'
                onClick={(): void => {
                  void handleCopyPreset(preset);
                }}
                className='h-8 w-8 cursor-pointer justify-center p-0'
              >
                <CopyIcon className='h-3.5 w-3.5' aria-hidden='true' />
              </DropdownMenuItem>
              <DropdownMenuItem
                aria-label={`Edit preset ${preset.name}`}
                title='Edit preset'
                onClick={(): void => openEditPresetDialog(preset)}
                className='h-8 w-8 cursor-pointer justify-center p-0'
              >
                <Pencil className='h-3.5 w-3.5' aria-hidden='true' />
              </DropdownMenuItem>
              <DropdownMenuItem
                aria-label={`Delete preset ${preset.name}`}
                title='Delete preset'
                onClick={(): void => {
                  void deletePreset(preset);
                }}
                className='h-8 w-8 cursor-pointer justify-center p-0 text-destructive focus:bg-destructive/10 focus:text-destructive'
              >
                <Trash2 className='h-3.5 w-3.5' aria-hidden='true' />
              </DropdownMenuItem>
            </div>
          ))
        )}
      </ActionMenu>
      <AppModal
        isOpen={isPresetDialogOpen}
        onClose={closePresetDialog}
        title={presetDialogMode === 'edit' ? 'Edit Filter Preset' : 'Save Filter Preset'}
        subtitle={
          presetDialogMode === 'edit'
            ? 'Update the preset name and advanced filter rules.'
            : 'Presets store advanced organisation filter sequences.'
        }
        size={presetDialogMode === 'edit' ? 'xl' : 'sm'}
        footer={
          <>
            <Button type='button' variant='outline' onClick={closePresetDialog}>
              Cancel
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                void savePresetDialog();
              }}
              disabled={savingPreset}
            >
              {presetDialogSubmitLabel}
            </Button>
          </>
        }
      >
        <div className='space-y-4'>
          <Input
            value={presetName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              setPresetName(event.target.value)
            }
            placeholder='Preset name'
            aria-label='Preset name'
            className='h-8'
            title='Preset name'
          />
          {presetDialogMode === 'edit' && presetFilterDraft !== null ? (
            <OrganizationAdvancedFilterBuilder
              group={presetFilterDraft}
              onChange={setPresetFilterDraft}
            />
          ) : null}
        </div>
      </AppModal>
      <JSONImportModal
        isOpen={isImportDialogOpen}
        onClose={(): void => setIsImportDialogOpen(false)}
        title='Import Filter Presets'
        subtitle='Paste organisation preset JSON or a preset bundle to merge into saved presets.'
        onImport={handleImportFromDialog}
        isLoading={importingPresets}
        confirmText='Import Presets'
        placeholder='Paste preset JSON here...'
      />
      <input
        ref={importFileInputRef}
        type='file'
        accept='application/json,.json'
        className='hidden'
        aria-label='Import organisation presets file'
        onChange={(event: ChangeEvent<HTMLInputElement>): void => {
          void handleImportFromFile(event);
        }}
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
        <>
          <OrganizationFilterPresetActions {...props} />
          <JobBoardScrapeAction
            onCompleted={props.onJobBoardScrapeCompleted}
            selectedOrganizationCount={props.selectedOrganizationCount}
            selectedOrganizationIds={selectedIds}
          />
        </>
      }
      actions={
        <DropdownMenuItem
          onClick={(): void => {
            void copySelectedIds();
          }}
          className='cursor-pointer gap-2'
          disabled={props.selectedOrganizationCount === 0}
        >
          <CopyIcon className='h-4 w-4' />
          Copy selected IDs
        </DropdownMenuItem>
      }
    />
  );
}
