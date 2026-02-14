'use client';

import { Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { IconSelector, ICON_LIBRARY, type IconLibraryItem } from '@/features/icons';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  Checkbox,
  Input,
  Label,
  SectionHeader,
  Textarea,
  SelectSimple,
  useToast,
} from '@/shared/ui';
import {
  createDefaultFolderTreeProfilesV2,
  FOLDER_TREE_PROFILES_V2_SETTING_KEY,
  type FolderTreeInstance,
  folderTreePlaceholderEmphasisValues,
  folderTreePlaceholderPresetOptions,
  folderTreeSelectionBehaviorValues,
  folderTreePlaceholderStyleValues,
  parseFolderTreeProfilesV2,
  type FolderTreeNestingRuleV2,
  type FolderTreeProfileV2,
  type FolderTreeProfilesV2Map,
} from '@/shared/utils/folder-tree-profiles-v2';

const INSTANCE_META: Array<{
  id: FolderTreeInstance;
  title: string;
  description: string;
  fileHint: string;
  folderHint: string;
}> = [
  {
    id: 'notes',
    title: 'Notes App',
    description: 'Controls the notes folder tree shown in the Notes workspace.',
    fileHint: 'Example: note',
    folderHint: 'Example: folder',
  },
  {
    id: 'image_studio',
    title: 'Image Studio',
    description: 'Controls folder/card nesting and placeholders in Image Studio.',
    fileHint: 'Example: card, generation, mask',
    folderHint: 'Example: folder',
  },
  {
    id: 'product_categories',
    title: 'Product Categories',
    description: 'Controls nesting behavior and visuals in Product Category tree.',
    fileHint: 'Usually empty for categories-only trees.',
    folderHint: 'Example: category',
  },
  {
    id: 'cms_page_builder',
    title: 'CMS Page Builder',
    description: 'Controls drop placeholders in the CMS structure tree.',
    fileHint: 'Example: section, block',
    folderHint: 'Example: zone, section',
  },
  {
    id: 'case_resolver',
    title: 'Case Resolver',
    description: 'Controls folder/case nesting and placeholders in Case Resolver.',
    fileHint: 'Example: case_file, node_file, asset_image, asset_pdf',
    folderHint: 'Example: folder',
  },
];

type NestingRuleKey = 'folder_to_folder' | 'file_to_folder' | 'folder_to_root' | 'file_to_root';

const NESTING_RULE_CONFIG: Record<
  NestingRuleKey,
  {
    childType: 'folder' | 'file';
    targetType: 'folder' | 'root';
    targetKinds: string[];
    defaultKinds: string[];
  }
> = {
  folder_to_folder: {
    childType: 'folder',
    targetType: 'folder',
    targetKinds: ['*'],
    defaultKinds: ['*'],
  },
  file_to_folder: {
    childType: 'file',
    targetType: 'folder',
    targetKinds: ['*'],
    defaultKinds: ['*'],
  },
  folder_to_root: {
    childType: 'folder',
    targetType: 'root',
    targetKinds: ['root'],
    defaultKinds: ['*'],
  },
  file_to_root: {
    childType: 'file',
    targetType: 'root',
    targetKinds: ['root'],
    defaultKinds: ['*'],
  },
};

const toKindList = (value: string): string[] =>
  value
    .split(',')
    .map((entry: string) => entry.trim().toLowerCase())
    .filter((entry: string) => entry.length > 0);

const listToValue = (values: string[]): string => values.join(', ');

const normalizeKindList = (values: string[] | null | undefined, fallback: string[]): string[] => {
  if (!Array.isArray(values) || values.length === 0) return [...fallback];
  const normalized = new Set<string>();
  values.forEach((entry: string) => {
    const value = entry.trim().toLowerCase();
    if (!value) return;
    normalized.add(value);
  });
  return normalized.size > 0 ? Array.from(normalized) : [...fallback];
};

const toTitleLabel = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const findRuleIndex = (profile: FolderTreeProfileV2, key: NestingRuleKey): number => {
  const config = NESTING_RULE_CONFIG[key];
  for (let index = profile.nesting.rules.length - 1; index >= 0; index -= 1) {
    const rule = profile.nesting.rules[index];
    if (!rule) continue;
    if (rule.childType !== config.childType) continue;
    if (rule.targetType !== config.targetType) continue;
    if (config.targetType === 'root') {
      const targetKinds = normalizeKindList(rule.targetKinds, ['root']);
      if (!targetKinds.includes('root') && !targetKinds.includes('*')) continue;
    }
    return index;
  }
  return -1;
};

const getRule = (profile: FolderTreeProfileV2, key: NestingRuleKey): FolderTreeNestingRuleV2 | null => {
  const index = findRuleIndex(profile, key);
  return index >= 0 ? profile.nesting.rules[index] ?? null : null;
};

const getRuleAllow = (profile: FolderTreeProfileV2, key: NestingRuleKey): boolean => {
  const rule = getRule(profile, key);
  return rule ? rule.allow : profile.nesting.defaultAllow;
};

const getRuleKinds = (profile: FolderTreeProfileV2, key: NestingRuleKey): string[] => {
  const config = NESTING_RULE_CONFIG[key];
  const rule = getRule(profile, key);
  return normalizeKindList(rule?.childKinds, config.defaultKinds);
};

const upsertRule = (
  profile: FolderTreeProfileV2,
  key: NestingRuleKey,
  update: Partial<Pick<FolderTreeNestingRuleV2, 'allow' | 'childKinds'>>
): FolderTreeProfileV2 => {
  const config = NESTING_RULE_CONFIG[key];
  const rules = [...profile.nesting.rules];
  const ruleIndex = findRuleIndex(profile, key);
  const existing = ruleIndex >= 0 ? rules[ruleIndex] : null;
  const childKinds = normalizeKindList(
    update.childKinds ?? existing?.childKinds ?? config.defaultKinds,
    config.defaultKinds
  );
  const targetKinds = normalizeKindList(existing?.targetKinds ?? config.targetKinds, config.targetKinds);
  const nextRule: FolderTreeNestingRuleV2 = {
    childType: config.childType,
    childKinds,
    targetType: config.targetType,
    targetKinds,
    allow: update.allow ?? existing?.allow ?? profile.nesting.defaultAllow,
  };

  if (ruleIndex >= 0) {
    rules[ruleIndex] = nextRule;
  } else {
    rules.push(nextRule);
  }

  return {
    ...profile,
    nesting: {
      ...profile.nesting,
      rules,
    },
  };
};

const byKindToValue = (byKind: Record<string, string | null>): string =>
  Object.entries(byKind)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, iconId]) => `${kind}=${iconId ?? ''}`)
    .join('\n');

const valueToByKind = (value: string): Record<string, string | null> => {
  const entries: Record<string, string | null> = {};
  value.split('\n').forEach((line: string) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) return;
    const separator = normalizedLine.includes('=') ? '=' : normalizedLine.includes(':') ? ':' : '';
    if (!separator) return;
    const parts = normalizedLine.split(separator);
    const key = parts.shift()?.trim().toLowerCase() ?? '';
    if (!key) return;
    const iconId = parts.join(separator).trim();
    entries[key] = iconId || null;
  });
  return entries;
};

const TREE_ICON_IDS = new Set<string>([
  'Folder',
  'FolderOpen',
  'FileText',
  'Image',
  'GripVertical',
  'LayoutGrid',
  'Box',
  'Tag',
  'Layers',
  'List',
  'ListChecks',
  'Archive',
  'Package',
  'BookOpen',
  'Map',
  'Library',
  'NotebookTabs',
  'FileCode2',
  'FileSpreadsheet',
  'NotepadText',
]);

const TREE_ICON_ITEMS: ReadonlyArray<IconLibraryItem> = ICON_LIBRARY.filter(
  (item: IconLibraryItem): boolean => TREE_ICON_IDS.has(item.id)
);

const folderTreeSelectionBehaviorOptions = folderTreeSelectionBehaviorValues.map((value) => ({
  value,
  label: value === 'click_away' ? 'Click Away Clears' : 'Re-click Clears (Sticky)',
}));

export function AdminFolderTreeSettingsPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawProfiles = settingsStore.get(FOLDER_TREE_PROFILES_V2_SETTING_KEY);
  const parsedProfiles = useMemo(
    (): FolderTreeProfilesV2Map => parseFolderTreeProfilesV2(rawProfiles),
    [rawProfiles]
  );

  const [draftProfiles, setDraftProfiles] = useState<FolderTreeProfilesV2Map>(parsedProfiles);

  useEffect(() => {
    setDraftProfiles(parsedProfiles);
  }, [parsedProfiles]);

  const isDirty = useMemo(
    () => JSON.stringify(draftProfiles) !== JSON.stringify(parsedProfiles),
    [draftProfiles, parsedProfiles]
  );

  const updateProfile = useCallback(
    (instance: FolderTreeInstance, updater: (profile: FolderTreeProfileV2) => FolderTreeProfileV2): void => {
      setDraftProfiles((prev: FolderTreeProfilesV2Map) => ({
        ...prev,
        [instance]: updater(prev[instance]),
      }));
    },
    []
  );

  const handleSave = useCallback(async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: FOLDER_TREE_PROFILES_V2_SETTING_KEY,
        value: JSON.stringify(draftProfiles),
      });
      toast('Folder tree profiles saved.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save folder tree profiles.', {
        variant: 'error',
      });
    }
  }, [draftProfiles, toast, updateSetting]);

  const handleResetToDefaults = useCallback((): void => {
    setDraftProfiles(createDefaultFolderTreeProfilesV2());
  }, []);

  const handleRevert = useCallback((): void => {
    setDraftProfiles(parsedProfiles);
  }, [parsedProfiles]);

  return (
    <div className='container mx-auto py-8'>
      <SectionHeader
        title='Folder Tree Profiles'
        description='Configure placeholders, nesting rules, and icons for each folder tree instance.'
        className='mb-6'
      />

      <div className='mb-4 flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={handleResetToDefaults}
          disabled={updateSetting.isPending}
        >
          Reset To Defaults
        </Button>
        <Button
          type='button'
          variant='outline'
          onClick={handleRevert}
          disabled={!isDirty || updateSetting.isPending}
        >
          Revert Changes
        </Button>
        <Button
          type='button'
          onClick={() => {
            void handleSave();
          }}
          disabled={!isDirty || updateSetting.isPending}
        >
          {updateSetting.isPending ? (
            <>
              <Loader2 className='mr-2 size-4 animate-spin' />
              Saving...
            </>
          ) : (
            'Save Profiles'
          )}
        </Button>
      </div>

      <div className='space-y-6'>
        {INSTANCE_META.map((meta) => {
          const profile = draftProfiles[meta.id];
          const allowFolderToFolder = getRuleAllow(profile, 'folder_to_folder');
          const allowFileToFolder = getRuleAllow(profile, 'file_to_folder');
          const allowFolderToRoot = getRuleAllow(profile, 'folder_to_root');
          const allowFileToRoot = getRuleAllow(profile, 'file_to_root');
          const folderKinds = getRuleKinds(profile, 'folder_to_folder');
          const fileKinds = getRuleKinds(profile, 'file_to_folder');

          return (
            <div
              key={meta.id}
              id={`folder-tree-instance-${meta.id}`}
              className='scroll-mt-24 space-y-5 rounded-lg border border-border/60 bg-card/40 p-5'
            >
              <div>
                <h2 className='text-sm font-semibold text-white'>{meta.title}</h2>
                <p className='mt-1 text-xs text-gray-400'>{meta.description}</p>
              </div>

              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Placeholder Preset</Label>
                  <SelectSimple size='sm'
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
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Placeholder Style</Label>
                  <SelectSimple size='sm'
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
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Placeholder Emphasis</Label>
                  <SelectSimple size='sm'
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
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Selection Behavior</Label>
                  <SelectSimple size='sm'
                    value={profile.interactions.selectionBehavior}
                    options={folderTreeSelectionBehaviorOptions}
                    onValueChange={(value: string): void => {
                      updateProfile(meta.id, (current) => ({
                        ...current,
                        interactions: {
                          ...current.interactions,
                          selectionBehavior: value as FolderTreeProfileV2['interactions']['selectionBehavior'],
                        },
                      }));
                    }}
                  />
                </div>

                <label className='flex items-start gap-2 rounded border border-border/50 p-3 text-xs text-gray-300'>
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
                  <span>Default allow (fallback)</span>
                </label>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Root Drop Label</Label>
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
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Inline Drop Label</Label>
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
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <label className='flex items-start gap-2 rounded border border-border/50 p-3 text-xs text-gray-300'>
                  <Checkbox
                    checked={allowFolderToFolder}
                    onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                      updateProfile(meta.id, (current) =>
                        upsertRule(current, 'folder_to_folder', { allow: checked === true })
                      );
                    }}
                  />
                  <span>Allow folder inside folder</span>
                </label>

                <label className='flex items-start gap-2 rounded border border-border/50 p-3 text-xs text-gray-300'>
                  <Checkbox
                    checked={allowFileToFolder}
                    onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                      updateProfile(meta.id, (current) =>
                        upsertRule(current, 'file_to_folder', { allow: checked === true })
                      );
                    }}
                  />
                  <span>Allow file inside folder</span>
                </label>

                <label className='flex items-start gap-2 rounded border border-border/50 p-3 text-xs text-gray-300'>
                  <Checkbox
                    checked={allowFolderToRoot}
                    onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                      updateProfile(meta.id, (current) =>
                        upsertRule(current, 'folder_to_root', { allow: checked === true })
                      );
                    }}
                  />
                  <span>Allow folder drop to root</span>
                </label>

                <label className='flex items-start gap-2 rounded border border-border/50 p-3 text-xs text-gray-300'>
                  <Checkbox
                    checked={allowFileToRoot}
                    onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                      updateProfile(meta.id, (current) =>
                        upsertRule(current, 'file_to_root', { allow: checked === true })
                      );
                    }}
                  />
                  <span>Allow file drop to root</span>
                </label>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Allowed Folder Kinds</Label>
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
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Allowed File Kinds</Label>
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
                </div>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs text-gray-300'>Blocked Target Folder Kinds</Label>
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
              </div>

              <div className='grid gap-4 xl:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Folder Closed Icon</Label>
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
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Folder Open Icon</Label>
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
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>File Icon</Label>
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
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Root/Drag Icons</Label>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    <div className='space-y-1'>
                      <Label className='text-[11px] text-gray-400'>Root</Label>
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
                    </div>
                    <div className='space-y-1'>
                      <Label className='text-[11px] text-gray-400'>Drag Handle</Label>
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
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs text-gray-300'>Kind-Specific Icons (kind=IconId, one per line)</Label>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
