'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getFolderTreeProfileV2Key,
  serializeFolderTreeProfileV2Entry,
} from '@/features/foldertree/v2/settings';
import { useFolderTreeProfiles } from '@/features/foldertree';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { Button, SectionHeader, useToast, FormActions } from '@/shared/ui';
import {
  createDefaultFolderTreeProfilesV2,
  type FolderTreeInstance,
  type FolderTreeProfileV2,
  type FolderTreeProfilesV2Map,
} from '@/shared/utils/folder-tree-profiles-v2';

import { InstanceSettingsPanel } from './folder-tree-settings/InstanceSettingsPanel';
import { INSTANCE_META } from './folder-tree-settings/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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
      logClientError(error);
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
    <div className='page-section-compact'>
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
        {INSTANCE_META.map((meta) => (
          <InstanceSettingsPanel
            key={meta.id}
            meta={meta}
            profile={draftProfiles[meta.id]}
            updateProfile={updateProfile}
          />
        ))}
      </div>
    </div>
  );
}
