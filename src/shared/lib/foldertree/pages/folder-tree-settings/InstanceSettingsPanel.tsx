'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { IconSelector } from '@/shared/lib/icons';
import { Checkbox, Input, Textarea, Card } from '@/shared/ui/primitives.public';
import { SectionHeader, UI_GRID_RELAXED_CLASSNAME, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { SelectSimple, FormField } from '@/shared/ui/forms-and-actions.public';
import {
  type FolderTreeInstance,
  folderTreePlaceholderEmphasisValues,
  folderTreePlaceholderPresetOptions,
  folderTreeSelectionBehaviorValues,
  folderTreePlaceholderStyleValues,
  type FolderTreeProfileV2,
  resolveFolderTreeKeyboardConfig,
  resolveFolderTreeMultiSelectConfig,
  resolveFolderTreeSearchConfig,
} from '@/shared/utils/folder-tree-profiles-v2';

import {
  getRuleAllow,
  getRuleKinds,
  upsertRule,
  byKindToValue,
  valueToByKind,
  toKindList,
  listToValue,
  toTitleLabel,
  TREE_ICON_ITEMS,
} from './utils';

const SEARCH_FILTER_MODE_OPTIONS = [
  { value: 'highlight', label: 'Highlight matches' },
  { value: 'filter_tree', label: 'Filter tree' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'highlight' | 'filter_tree'>>;

const folderTreePlaceholderStyleOptions: Array<
  LabeledOptionDto<FolderTreeProfileV2['placeholders']['style']>
> = folderTreePlaceholderStyleValues.map((value) => ({
  value,
  label: toTitleLabel(value),
}));

const folderTreePlaceholderEmphasisOptions: Array<
  LabeledOptionDto<FolderTreeProfileV2['placeholders']['emphasis']>
> = folderTreePlaceholderEmphasisValues.map((value) => ({
  value,
  label: toTitleLabel(value),
}));

const folderTreeSelectionBehaviorOptions: Array<
  LabeledOptionDto<FolderTreeProfileV2['interactions']['selectionBehavior']>
> = folderTreeSelectionBehaviorValues.map((value) => ({
  value,
  label: value === 'click_away' ? 'Click Away Clears' : 'Re-click Clears (Sticky)',
}));

interface InstanceSettingsPanelProps {
  meta: {
    id: FolderTreeInstance;
    title: string;
    description: string;
    fileHint: string;
    folderHint: string;
  };
  profile: FolderTreeProfileV2;
  updateProfile: (
    instance: FolderTreeInstance,
    updater: (profile: FolderTreeProfileV2) => FolderTreeProfileV2
  ) => void;
}

type CheckboxCardFieldArgs = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean | 'indeterminate') => void;
  label: string;
};

function renderCheckboxCardField({
  id,
  checked,
  onCheckedChange,
  label,
}: CheckboxCardFieldArgs): React.JSX.Element {
  return (
    <div className='block'>
      <Card
        variant='subtle-compact'
        padding='sm'
        className='flex items-start gap-2 border-border/50 bg-card/30'
      >
        <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
        <label htmlFor={id} className='flex-1 cursor-pointer text-xs text-gray-300'>
          {label}
        </label>
      </Card>
    </div>
  );
}

export function InstanceSettingsPanel(props: InstanceSettingsPanelProps): React.JSX.Element {
  const { meta, profile, updateProfile } = props;

  const allowFolderToFolder = getRuleAllow(profile, 'folder_to_folder');
  const allowFileToFolder = getRuleAllow(profile, 'file_to_folder');
  const allowFolderToRoot = getRuleAllow(profile, 'folder_to_root');
  const allowFileToRoot = getRuleAllow(profile, 'file_to_root');
  const folderKinds = getRuleKinds(profile, 'folder_to_folder');
  const fileKinds = getRuleKinds(profile, 'file_to_folder');
  const keyboardConfig = resolveFolderTreeKeyboardConfig(profile);
  const multiSelectConfig = resolveFolderTreeMultiSelectConfig(profile);
  const searchConfig = resolveFolderTreeSearchConfig(profile);

  return (
    <Card
      id={`folder-tree-instance-${meta.id}`}
      variant='subtle'
      padding='lg'
      className='scroll-mt-24 space-y-5 bg-card/40'
    >
      <SectionHeader title={meta.title} description={meta.description} size='xs' />

      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 xl:grid-cols-4`}>
        <FormField label='Placeholder Preset'>
          <SelectSimple
            size='sm'
            value={profile.placeholders.preset}
            options={folderTreePlaceholderPresetOptions}
            onValueChange={(value: string): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                placeholders: {
                  ...current.placeholders,
                  preset: value as FolderTreeProfileV2['placeholders']['preset'],
                },
              }));
            }}
           ariaLabel='Placeholder Preset' title='Placeholder Preset'/>
        </FormField>

        <FormField label='Placeholder Style'>
          <SelectSimple
            size='sm'
            value={profile.placeholders.style}
            options={folderTreePlaceholderStyleOptions}
            onValueChange={(value: string): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                placeholders: {
                  ...current.placeholders,
                  style: value as FolderTreeProfileV2['placeholders']['style'],
                },
              }));
            }}
           ariaLabel='Placeholder Style' title='Placeholder Style'/>
        </FormField>

        <FormField label='Placeholder Emphasis'>
          <SelectSimple
            size='sm'
            value={profile.placeholders.emphasis}
            options={folderTreePlaceholderEmphasisOptions}
            onValueChange={(value: string): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                placeholders: {
                  ...current.placeholders,
                  emphasis: value as FolderTreeProfileV2['placeholders']['emphasis'],
                },
              }));
            }}
           ariaLabel='Placeholder Emphasis' title='Placeholder Emphasis'/>
        </FormField>

        <FormField label='Selection Behavior'>
          <SelectSimple
            size='sm'
            value={profile.interactions.selectionBehavior}
            options={folderTreeSelectionBehaviorOptions}
            onValueChange={(value: string): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                interactions: {
                  ...current.interactions,
                  selectionBehavior:
                    value as FolderTreeProfileV2['interactions']['selectionBehavior'],
                },
              }));
            }}
           ariaLabel='Selection Behavior' title='Selection Behavior'/>
        </FormField>

        {renderCheckboxCardField({
          id: `folder-tree-${meta.id}-default-allow`,
          checked: profile.nesting.defaultAllow,
          onCheckedChange: (checked: boolean | 'indeterminate'): void => {
            updateProfile(meta.id, (current) => ({
              ...current,
              nesting: {
                ...current.nesting,
                defaultAllow: checked === true,
              },
            }));
          },
          label: 'Default allow (fallback)',
        })}
      </div>

      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
        <FormField label='Root Drop Label'>
          <Input
            value={profile.placeholders.rootDropLabel}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                placeholders: {
                  ...current.placeholders,
                  rootDropLabel: event.target.value,
                },
              }));
            }}
           aria-label='Root Drop Label' title='Root Drop Label'/>
        </FormField>

        <FormField label='Inline Drop Label'>
          <Input
            value={profile.placeholders.inlineDropLabel}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                placeholders: {
                  ...current.placeholders,
                  inlineDropLabel: event.target.value,
                },
              }));
            }}
           aria-label='Inline Drop Label' title='Inline Drop Label'/>
        </FormField>
      </div>

      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
        {renderCheckboxCardField({
          id: `folder-tree-${meta.id}-allow-folder-to-folder`,
          checked: allowFolderToFolder,
          onCheckedChange: (checked: boolean | 'indeterminate'): void => {
            updateProfile(meta.id, (current) =>
              upsertRule(current, 'folder_to_folder', { allow: checked === true })
            );
          },
          label: 'Allow folder inside folder',
        })}

        {renderCheckboxCardField({
          id: `folder-tree-${meta.id}-allow-file-to-folder`,
          checked: allowFileToFolder,
          onCheckedChange: (checked: boolean | 'indeterminate'): void => {
            updateProfile(meta.id, (current) =>
              upsertRule(current, 'file_to_folder', { allow: checked === true })
            );
          },
          label: 'Allow file inside folder',
        })}

        {renderCheckboxCardField({
          id: `folder-tree-${meta.id}-allow-folder-to-root`,
          checked: allowFolderToRoot,
          onCheckedChange: (checked: boolean | 'indeterminate'): void => {
            updateProfile(meta.id, (current) =>
              upsertRule(current, 'folder_to_root', { allow: checked === true })
            );
          },
          label: 'Allow folder drop to root',
        })}

        {renderCheckboxCardField({
          id: `folder-tree-${meta.id}-allow-file-to-root`,
          checked: allowFileToRoot,
          onCheckedChange: (checked: boolean | 'indeterminate'): void => {
            updateProfile(meta.id, (current) =>
              upsertRule(current, 'file_to_root', { allow: checked === true })
            );
          },
          label: 'Allow file drop to root',
        })}
      </div>

      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
        <FormField label='Allowed Folder Kinds'>
          <Input
            value={listToValue(folderKinds)}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              const nextKinds = toKindList(event.target.value);
              updateProfile(meta.id, (current) => {
                const withFolderRule = upsertRule(current, 'folder_to_folder', {
                  childKinds: nextKinds,
                });
                return upsertRule(withFolderRule, 'folder_to_root', {
                  childKinds: nextKinds,
                });
              });
            }}
            placeholder={meta.folderHint}
           aria-label={meta.folderHint} title={meta.folderHint}/>
        </FormField>

        <FormField label='Allowed File Kinds'>
          <Input
            value={listToValue(fileKinds)}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              const nextKinds = toKindList(event.target.value);
              updateProfile(meta.id, (current) => {
                const withFileRule = upsertRule(current, 'file_to_folder', {
                  childKinds: nextKinds,
                });
                return upsertRule(withFileRule, 'file_to_root', {
                  childKinds: nextKinds,
                });
              });
            }}
            placeholder={meta.fileHint}
           aria-label={meta.fileHint} title={meta.fileHint}/>
        </FormField>
      </div>

      <FormField label='Blocked Target Folder Kinds'>
        <Textarea
          value={listToValue(profile.nesting.blockedTargetKinds)}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            updateProfile(meta.id, (current) => ({
              ...current,
              nesting: {
                ...current.nesting,
                blockedTargetKinds: toKindList(event.target.value),
              },
            }));
          }}
          rows={2}
          placeholder='Example: archive, locked'
         aria-label='Example: archive, locked' title='Example: archive, locked'/>
      </FormField>

      <div className={`${UI_GRID_RELAXED_CLASSNAME} xl:grid-cols-2`}>
        <FormField label='Folder Closed Icon'>
          <IconSelector
            value={profile.icons.slots.folderClosed}
            items={TREE_ICON_ITEMS}
            onChange={(value: string | null): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                icons: {
                  ...current.icons,
                  slots: {
                    ...current.icons.slots,
                    folderClosed: value,
                  },
                },
              }));
            }}
            columns={8}
            showSearch={false}
          />
        </FormField>

        <FormField label='Folder Open Icon'>
          <IconSelector
            value={profile.icons.slots.folderOpen}
            items={TREE_ICON_ITEMS}
            onChange={(value: string | null): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                icons: {
                  ...current.icons,
                  slots: {
                    ...current.icons.slots,
                    folderOpen: value,
                  },
                },
              }));
            }}
            columns={8}
            showSearch={false}
          />
        </FormField>

        <FormField label='File Icon'>
          <IconSelector
            value={profile.icons.slots.file}
            items={TREE_ICON_ITEMS}
            onChange={(value: string | null): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                icons: {
                  ...current.icons,
                  slots: {
                    ...current.icons.slots,
                    file: value,
                  },
                },
              }));
            }}
            columns={8}
            showSearch={false}
          />
        </FormField>

        <FormField label='Root/Drag Icons'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Root'>
              <IconSelector
                value={profile.icons.slots.root}
                items={TREE_ICON_ITEMS}
                onChange={(value: string | null): void => {
                  updateProfile(meta.id, (current) => ({
                    ...current,
                    icons: {
                      ...current.icons,
                      slots: {
                        ...current.icons.slots,
                        root: value,
                      },
                    },
                  }));
                }}
                columns={6}
                showSearch={false}
              />
            </FormField>
            <FormField label='Drag Handle'>
              <IconSelector
                value={profile.icons.slots.dragHandle}
                items={TREE_ICON_ITEMS}
                onChange={(value: string | null): void => {
                  updateProfile(meta.id, (current) => ({
                    ...current,
                    icons: {
                      ...current.icons,
                      slots: {
                        ...current.icons.slots,
                        dragHandle: value,
                      },
                    },
                  }));
                }}
                columns={6}
                showSearch={false}
              />
            </FormField>
          </div>
        </FormField>
      </div>

      <FormField label='Kind-Specific Icons (kind=IconId, one per line)'>
        <Textarea
          value={byKindToValue(profile.icons.byKind)}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            updateProfile(meta.id, (current) => ({
              ...current,
              icons: {
                ...current.icons,
                byKind: valueToByKind(event.target.value),
              },
            }));
          }}
          rows={4}
          placeholder='note=FileText'
         aria-label='note=FileText' title='note=FileText'/>
      </FormField>

      {/* ── Capabilities ── */}
      <div>
        <p className='mb-3 text-xs font-medium uppercase tracking-wide text-gray-400'>
          Capabilities
        </p>
        <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-3`}>
          {/* Keyboard Navigation */}
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-gray-300'>Keyboard Navigation</p>
            {renderCheckboxCardField({
              id: `folder-tree-${meta.id}-keyboard-enabled`,
              checked: keyboardConfig.enabled,
              onCheckedChange: (checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) => ({
                  ...current,
                  keyboard: { ...current.keyboard, enabled: checked === true },
                }));
              },
              label: 'Enable keyboard nav',
            })}
            {renderCheckboxCardField({
              id: `folder-tree-${meta.id}-keyboard-arrow-navigation`,
              checked: keyboardConfig.arrowNavigation,
              onCheckedChange: (checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) => ({
                  ...current,
                  keyboard: {
                    ...current.keyboard,
                    arrowNavigation: checked === true,
                  },
                }));
              },
              label: 'Arrow key navigation',
            })}
            {renderCheckboxCardField({
              id: `folder-tree-${meta.id}-keyboard-enter-to-rename`,
              checked: keyboardConfig.enterToRename,
              onCheckedChange: (checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) => ({
                  ...current,
                  keyboard: {
                    ...current.keyboard,
                    enterToRename: checked === true,
                  },
                }));
              },
              label: 'Enter to rename',
            })}
            {renderCheckboxCardField({
              id: `folder-tree-${meta.id}-keyboard-delete-key`,
              checked: keyboardConfig.deleteKey,
              onCheckedChange: (checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) => ({
                  ...current,
                  keyboard: { ...current.keyboard, deleteKey: checked === true },
                }));
              },
              label: 'Delete key',
            })}
          </div>

          {/* Multi-Selection */}
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-gray-300'>Multi-Selection</p>
            {renderCheckboxCardField({
              id: `folder-tree-${meta.id}-multi-select-enabled`,
              checked: multiSelectConfig.enabled,
              onCheckedChange: (checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) => ({
                  ...current,
                  multiSelect: {
                    ...current.multiSelect,
                    enabled: checked === true,
                  },
                }));
              },
              label: 'Enable multi-selection',
            })}
            {renderCheckboxCardField({
              id: `folder-tree-${meta.id}-multi-select-ctrl-click`,
              checked: multiSelectConfig.ctrlClick,
              onCheckedChange: (checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) => ({
                  ...current,
                  multiSelect: {
                    ...current.multiSelect,
                    ctrlClick: checked === true,
                  },
                }));
              },
              label: 'Ctrl/Cmd+click toggle',
            })}
            {renderCheckboxCardField({
              id: `folder-tree-${meta.id}-multi-select-shift-click`,
              checked: multiSelectConfig.shiftClick,
              onCheckedChange: (checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) => ({
                  ...current,
                  multiSelect: {
                    ...current.multiSelect,
                    shiftClick: checked === true,
                  },
                }));
              },
              label: 'Shift+click range',
            })}
            {renderCheckboxCardField({
              id: `folder-tree-${meta.id}-multi-select-select-all`,
              checked: multiSelectConfig.selectAll,
              onCheckedChange: (checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) => ({
                  ...current,
                  multiSelect: {
                    ...current.multiSelect,
                    selectAll: checked === true,
                  },
                }));
              },
              label: 'Ctrl/Cmd+A select all',
            })}
          </div>

          {/* Search Bar */}
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-gray-300'>Search Bar</p>
            {renderCheckboxCardField({
              id: `folder-tree-${meta.id}-search-enabled`,
              checked: searchConfig.enabled,
              onCheckedChange: (checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) => ({
                  ...current,
                  search: { ...current.search, enabled: checked === true },
                }));
              },
              label: 'Enable search bar',
            })}
            <FormField label='Filter Mode'>
              <SelectSimple
                size='sm'
                value={searchConfig.filterMode}
                options={SEARCH_FILTER_MODE_OPTIONS}
                onValueChange={(value: string): void => {
                  updateProfile(meta.id, (current) => ({
                    ...current,
                    search: {
                      ...current.search,
                      filterMode: value as 'highlight' | 'filter_tree',
                    },
                  }));
                }}
               ariaLabel='Filter Mode' title='Filter Mode'/>
            </FormField>
            <FormField label='Debounce (ms)'>
              <Input
                type='number'
                min={0}
                max={2000}
                value={searchConfig.debounceMs}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  const parsed = parseInt(event.target.value, 10);
                  updateProfile(meta.id, (current) => ({
                    ...current,
                    search: {
                      ...current.search,
                      debounceMs: Number.isFinite(parsed) ? parsed : 200,
                    },
                  }));
                }}
               aria-label='Debounce (ms)' title='Debounce (ms)'/>
            </FormField>
            <FormField label='Min Query Length'>
              <Input
                type='number'
                min={0}
                max={10}
                value={searchConfig.minQueryLength}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  const parsed = parseInt(event.target.value, 10);
                  updateProfile(meta.id, (current) => ({
                    ...current,
                    search: {
                      ...current.search,
                      minQueryLength: Number.isFinite(parsed) ? parsed : 1,
                    },
                  }));
                }}
               aria-label='Min Query Length' title='Min Query Length'/>
            </FormField>
          </div>
        </div>
      </div>
    </Card>
  );
}
