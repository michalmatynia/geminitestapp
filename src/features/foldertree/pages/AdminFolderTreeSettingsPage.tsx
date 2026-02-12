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
  SectionPanel,
  Textarea,
  UnifiedSelect,
  useToast,
} from '@/shared/ui';
import {
  createDefaultFolderTreeProfiles,
  FOLDER_TREE_PROFILES_SETTING_KEY,
  folderTreePlaceholderPresetOptions,
  parseFolderTreeProfiles,
  type FolderTreeInstance,
  type FolderTreeProfile,
  type FolderTreeProfilesMap,
} from '@/shared/utils/folder-tree-profiles';

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
];

const toKindList = (value: string): string[] =>
  value
    .split(',')
    .map((entry: string) => entry.trim().toLowerCase())
    .filter((entry: string) => entry.length > 0);

const listToValue = (values: string[]): string => values.join(', ');

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

export function AdminFolderTreeSettingsPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawProfiles = settingsStore.get(FOLDER_TREE_PROFILES_SETTING_KEY);
  const parsedProfiles = useMemo(
    () => parseFolderTreeProfiles(rawProfiles),
    [rawProfiles]
  );

  const [draftProfiles, setDraftProfiles] = useState<FolderTreeProfilesMap>(parsedProfiles);

  useEffect(() => {
    setDraftProfiles(parsedProfiles);
  }, [parsedProfiles]);

  const isDirty = useMemo(
    () => JSON.stringify(draftProfiles) !== JSON.stringify(parsedProfiles),
    [draftProfiles, parsedProfiles]
  );

  const updateProfile = useCallback(
    (instance: FolderTreeInstance, updater: (profile: FolderTreeProfile) => FolderTreeProfile): void => {
      setDraftProfiles((prev: FolderTreeProfilesMap) => ({
        ...prev,
        [instance]: updater(prev[instance]),
      }));
    },
    []
  );

  const handleSave = useCallback(async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: FOLDER_TREE_PROFILES_SETTING_KEY,
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
    setDraftProfiles(createDefaultFolderTreeProfiles());
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
          return (
            <SectionPanel key={meta.id} variant='subtle' className='space-y-5 p-5'>
              <div>
                <h2 className='text-sm font-semibold text-white'>{meta.title}</h2>
                <p className='mt-1 text-xs text-gray-400'>{meta.description}</p>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Placeholder Style</Label>
                  <UnifiedSelect
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
                          preset: value as FolderTreeProfile['placeholders']['preset'],
                        },
                      }));
                    }}
                  />
                </div>

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

              <div className='grid gap-4 md:grid-cols-2'>
                <label className='flex items-start gap-2 rounded border border-border/50 p-3 text-xs text-gray-300'>
                  <Checkbox
                    checked={profile.nesting.allowFolderToFolder}
                    onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                      updateProfile(meta.id, (current) => ({
                        ...current,
                        nesting: {
                          ...current.nesting,
                          allowFolderToFolder: checked === true,
                        },
                      }));
                    }}
                  />
                  <span>Allow folder inside folder</span>
                </label>

                <label className='flex items-start gap-2 rounded border border-border/50 p-3 text-xs text-gray-300'>
                  <Checkbox
                    checked={profile.nesting.allowFileToFolder}
                    onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                      updateProfile(meta.id, (current) => ({
                        ...current,
                        nesting: {
                          ...current.nesting,
                          allowFileToFolder: checked === true,
                        },
                      }));
                    }}
                  />
                  <span>Allow file inside folder</span>
                </label>

                <label className='flex items-start gap-2 rounded border border-border/50 p-3 text-xs text-gray-300'>
                  <Checkbox
                    checked={profile.nesting.allowRootFolderDrop}
                    onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                      updateProfile(meta.id, (current) => ({
                        ...current,
                        nesting: {
                          ...current.nesting,
                          allowRootFolderDrop: checked === true,
                        },
                      }));
                    }}
                  />
                  <span>Allow folder drop to root</span>
                </label>

                <label className='flex items-start gap-2 rounded border border-border/50 p-3 text-xs text-gray-300'>
                  <Checkbox
                    checked={profile.nesting.allowRootFileDrop}
                    onCheckedChange={(checked: boolean | 'indeterminate'): void => {
                      updateProfile(meta.id, (current) => ({
                        ...current,
                        nesting: {
                          ...current.nesting,
                          allowRootFileDrop: checked === true,
                        },
                      }));
                    }}
                  />
                  <span>Allow file drop to root</span>
                </label>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Allowed Folder Kinds</Label>
                  <Input
                    value={listToValue(profile.nesting.folderKindsAllowedAsChildren)}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      updateProfile(meta.id, (current) => ({
                        ...current,
                        nesting: {
                          ...current.nesting,
                          folderKindsAllowedAsChildren: toKindList(event.target.value),
                        },
                      }));
                    }}
                    placeholder={meta.folderHint}
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs text-gray-300'>Allowed File Kinds</Label>
                  <Input
                    value={listToValue(profile.nesting.fileKindsAllowedAsChildren)}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      updateProfile(meta.id, (current) => ({
                        ...current,
                        nesting: {
                          ...current.nesting,
                          fileKindsAllowedAsChildren: toKindList(event.target.value),
                        },
                      }));
                    }}
                    placeholder={meta.fileHint}
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs text-gray-300'>Blocked Target Folder Kinds</Label>
                <Textarea
                  value={listToValue(profile.nesting.blockedTargetFolderKinds)}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                    updateProfile(meta.id, (current) => ({
                      ...current,
                      nesting: {
                        ...current.nesting,
                        blockedTargetFolderKinds: toKindList(event.target.value),
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
                    value={profile.icons.folderClosed}
                    items={TREE_ICON_ITEMS}
                    onChange={(value: string | null): void => {
                      updateProfile(meta.id, (current) => ({
                        ...current,
                        icons: {
                          ...current.icons,
                          folderClosed: value,
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
                    value={profile.icons.folderOpen}
                    items={TREE_ICON_ITEMS}
                    onChange={(value: string | null): void => {
                      updateProfile(meta.id, (current) => ({
                        ...current,
                        icons: {
                          ...current.icons,
                          folderOpen: value,
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
                    value={profile.icons.file}
                    items={TREE_ICON_ITEMS}
                    onChange={(value: string | null): void => {
                      updateProfile(meta.id, (current) => ({
                        ...current,
                        icons: {
                          ...current.icons,
                          file: value,
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
                        value={profile.icons.root}
                        items={TREE_ICON_ITEMS}
                        onChange={(value: string | null): void => {
                          updateProfile(meta.id, (current) => ({
                            ...current,
                            icons: {
                              ...current.icons,
                              root: value,
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
                        value={profile.icons.dragHandle}
                        items={TREE_ICON_ITEMS}
                        onChange={(value: string | null): void => {
                          updateProfile(meta.id, (current) => ({
                            ...current,
                            icons: {
                              ...current.icons,
                              dragHandle: value,
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
            </SectionPanel>
          );
        })}
      </div>
    </div>
  );
}
