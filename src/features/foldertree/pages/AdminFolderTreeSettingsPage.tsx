'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { IconSelector, ICON_LIBRARY, type IconLibraryItem } from '@/shared/lib/icons';
import {
  getFolderTreeProfileV2Key,
  serializeFolderTreeProfileV2Entry,
} from '@/features/foldertree/v2/settings';
import { useFolderTreeProfiles } from '@/shared/hooks/use-folder-tree-profile';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  Button,
  Checkbox,
  Input,
  SectionHeader,
  Textarea,
  SelectSimple,
  useToast,
  FormField,
  FormActions,
  Card,
} from '@/shared/ui';
import {
  createDefaultFolderTreeProfilesV2,
  type FolderTreeInstance,
  folderTreePlaceholderEmphasisValues,
  folderTreePlaceholderPresetOptions,
  folderTreeInstanceValues,
  folderTreeSettingsMetaByInstance,
  folderTreeSelectionBehaviorValues,
  folderTreePlaceholderStyleValues,
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
}> = folderTreeInstanceValues.map((id: FolderTreeInstance) => ({
  id,
  ...folderTreeSettingsMetaByInstance[id],
}));

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

const getRule = (
  profile: FolderTreeProfileV2,
  key: NestingRuleKey
): FolderTreeNestingRuleV2 | null => {
  const index = findRuleIndex(profile, key);
  return index >= 0 ? (profile.nesting.rules[index] ?? null) : null;
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
  const targetKinds = normalizeKindList(
    existing?.targetKinds ?? config.targetKinds,
    config.targetKinds
  );
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
  const parsedProfiles = useFolderTreeProfiles();
  const updateSettingsBulk = useUpdateSettingsBulk();
  const { toast } = useToast();
  const mutationState = updateSettingsBulk as { isPending?: boolean };
  const isSaving = mutationState.isPending === true;

  const [draftProfiles, setDraftProfiles] = useState<FolderTreeProfilesV2Map>(parsedProfiles);

  useEffect(() => {
    setDraftProfiles(parsedProfiles);
  }, [parsedProfiles]);

  const isDirty = useMemo(
    () => JSON.stringify(draftProfiles) !== JSON.stringify(parsedProfiles),
    [draftProfiles, parsedProfiles]
  );

  const updateProfile = useCallback(
    (
      instance: FolderTreeInstance,
      updater: (profile: FolderTreeProfileV2) => FolderTreeProfileV2
    ): void => {
      setDraftProfiles((prev: FolderTreeProfilesV2Map) => ({
        ...prev,
        [instance]: updater(prev[instance]),
      }));
    },
    []
  );

  const handleSave = useCallback(async (): Promise<void> => {
    try {
      await updateSettingsBulk.mutateAsync(
        INSTANCE_META.map((meta) => ({
          key: getFolderTreeProfileV2Key(meta.id),
          value: serializeFolderTreeProfileV2Entry(draftProfiles[meta.id]),
        }))
      );
      toast('Folder tree profiles saved.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save folder tree profiles.', {
        variant: 'error',
      });
    }
  }, [draftProfiles, toast, updateSettingsBulk]);

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
        description='Configure placeholders, nesting rules, icons, and capabilities (keyboard nav, multi-selection, search) for each folder tree instance.'
        className='mb-6'
      />

      <FormActions
        onCancel={handleRevert}
        onSave={() => {
          void handleSave();
        }}
        saveText='Save Profiles'
        cancelText='Revert Changes'
        isDisabled={!isDirty || isSaving}
        isSaving={isSaving}
        className='mb-4 flex-wrap justify-start'
      >
        <Button type='button' variant='outline' onClick={handleResetToDefaults} disabled={isSaving}>
          Reset To Defaults
        </Button>
      </FormActions>

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
            <Card
              key={meta.id}
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
                          checked={profile.keyboard?.enabled ?? false}
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
                          checked={profile.keyboard?.arrowNavigation ?? true}
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
                          checked={profile.keyboard?.enterToRename ?? true}
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
                          checked={profile.keyboard?.deleteKey ?? false}
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
                          checked={profile.multiSelect?.enabled ?? false}
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
                          checked={profile.multiSelect?.ctrlClick ?? true}
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
                          checked={profile.multiSelect?.shiftClick ?? true}
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
                          checked={profile.multiSelect?.selectAll ?? true}
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
                          checked={profile.search?.enabled ?? false}
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
                        value={profile.search?.filterMode ?? 'highlight'}
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
                        value={profile.search?.debounceMs ?? 200}
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
                        value={profile.search?.minQueryLength ?? 1}
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
        })}
      </div>
    </div>
  );
}
