'use client';

import {
  Copy,
  Download,
  FileUp,
  Pencil,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';

import { ActionMenu } from '@/shared/ui/ActionMenu';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';

import type { ProductSelectionActionsController } from './ProductSelectionActions.types';

type ProductFilterPresetMenuProps = {
  controller: ProductSelectionActionsController;
};

export const ProductFilterPresetMenu = ({
  controller,
}: ProductFilterPresetMenuProps): React.JSX.Element => (
  <ActionMenu
    triggerId='product-filter-presets-menu'
    align='end'
    className='w-80 max-w-[calc(100vw-2rem)]'
    trigger={<FilterPresetTrigger />}
    triggerClassName='h-8 w-full px-3 border border-border/60 bg-card/30 hover:bg-card/50 text-gray-300 hover:text-white sm:w-auto'
    variant='outline'
    size='sm'
  >
    <DropdownMenuLabel>Advanced Filter Presets</DropdownMenuLabel>
    <FilterPresetMenuActions controller={controller} />
    <DropdownMenuSeparator />
    <FilterPresetList controller={controller} />
  </ActionMenu>
);

const FilterPresetTrigger = (): React.JSX.Element => (
  <div className='flex items-center gap-2'>
    <SlidersHorizontal className='h-3.5 w-3.5' />
    <span className='text-xs font-medium'>Filter Presets</span>
  </div>
);

const FilterPresetMenuActions = ({
  controller,
}: ProductFilterPresetMenuProps): React.JSX.Element => {
  const { presets } = controller;
  return (
    <>
      <DropdownMenuItem
        onClick={presets.openCreatePresetDialog}
        disabled={presets.currentAdvancedFilterGroup === null}
        className='cursor-pointer gap-2'
      >
        <Save className='h-4 w-4' />
        Save Current Filter
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={presets.handleExportAllPresets}
        disabled={presets.advancedFilterPresets.length === 0}
        className='cursor-pointer gap-2'
      >
        <Download className='h-4 w-4' />
        Export All Presets
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          void presets.handleCopyAllPresets();
        }}
        disabled={presets.advancedFilterPresets.length === 0}
        className='cursor-pointer gap-2'
      >
        <Copy className='h-4 w-4' />
        Copy All Presets JSON
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => presets.setImportDialogOpen(true)}
        className='cursor-pointer gap-2'
      >
        <Upload className='h-4 w-4' />
        Import From Pasted JSON
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => presets.importFileInputRef.current?.click()}
        className='cursor-pointer gap-2'
      >
        <FileUp className='h-4 w-4' />
        Import From File
      </DropdownMenuItem>
    </>
  );
};

const FilterPresetList = ({
  controller,
}: ProductFilterPresetMenuProps): React.JSX.Element => {
  const { presets } = controller;
  if (presets.advancedFilterPresets.length === 0) {
    return <DropdownMenuItem disabled>No presets saved</DropdownMenuItem>;
  }
  return (
    <>
      {presets.advancedFilterPresets.map((preset) => (
        <div
          key={preset.id}
          role='group'
          aria-label={`Preset ${preset.name}`}
          className='flex items-center gap-1 rounded-sm px-1 py-0.5'
        >
          <DropdownMenuItem
            onClick={() => presets.handleApplyPreset(preset)}
            className='min-w-0 flex-1 cursor-pointer gap-2 px-2'
            title={`Apply preset ${preset.name}`}
          >
            <span className='truncate'>{preset.name}</span>
            {presets.activeAdvancedFilterPresetId === preset.id ? (
              <span className='ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary'>
                Applied
              </span>
            ) : null}
          </DropdownMenuItem>
          <PresetIconActions controller={controller} preset={preset} />
        </div>
      ))}
    </>
  );
};

const PresetIconActions = ({
  controller,
  preset,
}: ProductFilterPresetMenuProps & {
  preset: ProductSelectionActionsController['presets']['advancedFilterPresets'][number];
}): React.JSX.Element => {
  const { presets } = controller;
  return (
    <>
      <DropdownMenuItem
        aria-label={`Export preset ${preset.name}`}
        title='Export JSON'
        onClick={() => presets.handleExportSinglePreset(preset)}
        className='h-8 w-8 cursor-pointer justify-center p-0'
      >
        <Download className='h-3.5 w-3.5' aria-hidden='true' />
      </DropdownMenuItem>
      <DropdownMenuItem
        aria-label={`Copy preset ${preset.name}`}
        title='Copy JSON'
        onClick={() => {
          void presets.handleCopyPreset(preset);
        }}
        className='h-8 w-8 cursor-pointer justify-center p-0'
      >
        <Copy className='h-3.5 w-3.5' aria-hidden='true' />
      </DropdownMenuItem>
      <DropdownMenuItem
        aria-label={`Edit preset ${preset.name}`}
        title='Edit preset'
        onClick={() => presets.openEditPresetDialog(preset)}
        className='h-8 w-8 cursor-pointer justify-center p-0'
      >
        <Pencil className='h-3.5 w-3.5' aria-hidden='true' />
      </DropdownMenuItem>
      <DropdownMenuItem
        aria-label={`Delete preset ${preset.name}`}
        title='Delete preset'
        onClick={() => {
          void presets.handleDeletePreset(preset);
        }}
        className='h-8 w-8 cursor-pointer justify-center p-0 text-destructive focus:bg-destructive/10 focus:text-destructive'
      >
        <Trash2 className='h-3.5 w-3.5' aria-hidden='true' />
      </DropdownMenuItem>
    </>
  );
};
