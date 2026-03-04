'use client';

import React from 'react';
import { IconSelector } from '@/shared/lib/icons';
import {
  Checkbox,
  Input,
  SectionHeader,
  Textarea,
  SelectSimple,
  FormField,
  Card,
} from '@/shared/ui';
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

const folderTreeSelectionBehaviorOptions = folderTreeSelectionBehaviorValues.map((value) => ({
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

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <FormField label='Placeholder Preset'>
          <SelectSimple
            size='sm'
            value={profile.placeholders.preset}
            options={folderTreePlaceholderPresetOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onValueChange={(value: string): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                placeholders: {
                  ...current.placeholders,
                  preset: value as FolderTreeProfileV2['placeholders']['preset'],
                },
              }));
            }}
          />
        </FormField>

        <FormField label='Placeholder Style'>
          <SelectSimple
            size='sm'
            value={profile.placeholders.style}
            options={folderTreePlaceholderStyleValues.map((value) => ({
              value,
              label: toTitleLabel(value),
            }))}
            onValueChange={(value: string): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                placeholders: {
                  ...current.placeholders,
                  style: value as FolderTreeProfileV2['placeholders']['style'],
                },
              }));
            }}
          />
        </FormField>

        <FormField label='Placeholder Emphasis'>
          <SelectSimple
            size='sm'
            value={profile.placeholders.emphasis}
            options={folderTreePlaceholderEmphasisValues.map((value) => ({
              value,
              label: toTitleLabel(value),
            }))}
            onValueChange={(value: string): void => {
              updateProfile(meta.id, (current) => ({
                ...current,
                placeholders: {
                  ...current.placeholders,
                  emphasis: value as FolderTreeProfileV2['placeholders']['emphasis'],
                },
              }));
            }}
          />
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
          />
        </FormField>

        <label className='block cursor-pointer'>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='flex items-start gap-2 border-border/50 bg-card/30'
          >
            <Checkbox
              checked={profile.nesting.defaultAllow}
              onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) => ({
                  ...current,
                  nesting: {
                    ...current.nesting,
                    defaultAllow: checked === true,
                  },
                }));
              }}
            />
            <span className='text-xs text-gray-300'>Default allow (fallback)</span>
          </Card>
        </label>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
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
          />
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
          />
        </FormField>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <label className='block cursor-pointer'>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='flex items-start gap-2 border-border/50 bg-card/30'
          >
            <Checkbox
              checked={allowFolderToFolder}
              onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) =>
                  upsertRule(current, 'folder_to_folder', { allow: checked === true })
                );
              }}
            />
            <span className='text-xs text-gray-300'>Allow folder inside folder</span>
          </Card>
        </label>

        <label className='block cursor-pointer'>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='flex items-start gap-2 border-border/50 bg-card/30'
          >
            <Checkbox
              checked={allowFileToFolder}
              onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) =>
                  upsertRule(current, 'file_to_folder', { allow: checked === true })
                );
              }}
            />
            <span className='text-xs text-gray-300'>Allow file inside folder</span>
          </Card>
        </label>

        <label className='block cursor-pointer'>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='flex items-start gap-2 border-border/50 bg-card/30'
          >
            <Checkbox
              checked={allowFolderToRoot}
              onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) =>
                  upsertRule(current, 'folder_to_root', { allow: checked === true })
                );
              }}
            />
            <span className='text-xs text-gray-300'>Allow folder drop to root</span>
          </Card>
        </label>

        <label className='block cursor-pointer'>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='flex items-start gap-2 border-border/50 bg-card/30'
          >
            <Checkbox
              checked={allowFileToRoot}
              onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                updateProfile(meta.id, (current) =>
                  upsertRule(current, 'file_to_root', { allow: checked === true })
                );
              }}
            />
            <span className='text-xs text-gray-300'>Allow file drop to root</span>
          </Card>
        </label>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
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
          />
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
          />
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
        />
      </FormField>

      <div className='grid gap-4 xl:grid-cols-2'>
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
        />
      </FormField>

      {/* ── Capabilities ── */}
      <div>
        <p className='mb-3 text-xs font-medium uppercase tracking-wide text-gray-400'>
          Capabilities
        </p>
        <div className='grid gap-6 lg:grid-cols-3'>
          {/* Keyboard Navigation */}
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-gray-300'>Keyboard Navigation</p>
            <label className='block cursor-pointer'>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-start gap-2 border-border/50 bg-card/30'
              >
                <Checkbox
                  checked={keyboardConfig.enabled}
                  onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                    updateProfile(meta.id, (current) => ({
                      ...current,
                      keyboard: { ...current.keyboard, enabled: checked === true },
                    }));
                  }}
                />
                <span className='text-xs text-gray-300'>Enable keyboard nav</span>
              </Card>
            </label>
            <label className='block cursor-pointer'>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-start gap-2 border-border/50 bg-card/30'
              >
                <Checkbox
                  checked={keyboardConfig.arrowNavigation}
                  onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                    updateProfile(meta.id, (current) => ({
                      ...current,
                      keyboard: {
                        ...current.keyboard,
                        arrowNavigation: checked === true,
                      },
                    }));
                  }}
                />
                <span className='text-xs text-gray-300'>Arrow key navigation</span>
              </Card>
            </label>
            <label className='block cursor-pointer'>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-start gap-2 border-border/50 bg-card/30'
              >
                <Checkbox
                  checked={keyboardConfig.enterToRename}
                  onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                    updateProfile(meta.id, (current) => ({
                      ...current,
                      keyboard: {
                        ...current.keyboard,
                        enterToRename: checked === true,
                      },
                    }));
                  }}
                />
                <span className='text-xs text-gray-300'>Enter to rename</span>
              </Card>
            </label>
            <label className='block cursor-pointer'>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-start gap-2 border-border/50 bg-card/30'
              >
                <Checkbox
                  checked={keyboardConfig.deleteKey}
                  onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                    updateProfile(meta.id, (current) => ({
                      ...current,
                      keyboard: { ...current.keyboard, deleteKey: checked === true },
                    }));
                  }}
                />
                <span className='text-xs text-gray-300'>Delete key</span>
              </Card>
            </label>
          </div>

          {/* Multi-Selection */}
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-gray-300'>Multi-Selection</p>
            <label className='block cursor-pointer'>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-start gap-2 border-border/50 bg-card/30'
              >
                <Checkbox
                  checked={multiSelectConfig.enabled}
                  onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                    updateProfile(meta.id, (current) => ({
                      ...current,
                      multiSelect: {
                        ...current.multiSelect,
                        enabled: checked === true,
                      },
                    }));
                  }}
                />
                <span className='text-xs text-gray-300'>Enable multi-selection</span>
              </Card>
            </label>
            <label className='block cursor-pointer'>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-start gap-2 border-border/50 bg-card/30'
              >
                <Checkbox
                  checked={multiSelectConfig.ctrlClick}
                  onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                    updateProfile(meta.id, (current) => ({
                      ...current,
                      multiSelect: {
                        ...current.multiSelect,
                        ctrlClick: checked === true,
                      },
                    }));
                  }}
                />
                <span className='text-xs text-gray-300'>Ctrl/Cmd+click toggle</span>
              </Card>
            </label>
            <label className='block cursor-pointer'>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-start gap-2 border-border/50 bg-card/30'
              >
                <Checkbox
                  checked={multiSelectConfig.shiftClick}
                  onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                    updateProfile(meta.id, (current) => ({
                      ...current,
                      multiSelect: {
                        ...current.multiSelect,
                        shiftClick: checked === true,
                      },
                    }));
                  }}
                />
                <span className='text-xs text-gray-300'>Shift+click range</span>
              </Card>
            </label>
            <label className='block cursor-pointer'>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-start gap-2 border-border/50 bg-card/30'
              >
                <Checkbox
                  checked={multiSelectConfig.selectAll}
                  onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                    updateProfile(meta.id, (current) => ({
                      ...current,
                      multiSelect: {
                        ...current.multiSelect,
                        selectAll: checked === true,
                      },
                    }));
                  }}
                />
                <span className='text-xs text-gray-300'>Ctrl/Cmd+A select all</span>
              </Card>
            </label>
          </div>

          {/* Search Bar */}
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-gray-300'>Search Bar</p>
            <label className='block cursor-pointer'>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-start gap-2 border-border/50 bg-card/30'
              >
                <Checkbox
                  checked={searchConfig.enabled}
                  onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                    updateProfile(meta.id, (current) => ({
                      ...current,
                      search: { ...current.search, enabled: checked === true },
                    }));
                  }}
                />
                <span className='text-xs text-gray-300'>Enable search bar</span>
              </Card>
            </label>
            <FormField label='Filter Mode'>
              <SelectSimple
                size='sm'
                value={searchConfig.filterMode}
                options={[
                  { value: 'highlight', label: 'Highlight matches' },
                  { value: 'filter_tree', label: 'Filter tree' },
                ]}
                onValueChange={(value: string): void => {
                  updateProfile(meta.id, (current) => ({
                    ...current,
                    search: {
                      ...current.search,
                      filterMode: value as 'highlight' | 'filter_tree',
                    },
                  }));
                }}
              />
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
              />
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
              />
            </FormField>
          </div>
        </div>
      </div>
    </Card>
  );
}
