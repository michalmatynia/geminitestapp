'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import { Button, Card, useToast } from '@/shared/ui/primitives.public';
import { FormActions, FormField, SelectSimple, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import {
  createDefaultTextEditorEngineProfiles,
} from '../defaults';
import {
  getTextEditorProfileKey,
  serializeTextEditorProfileEntry,
} from '../settings';
import {
  TEXT_EDITOR_INSTANCE_META,
  useTextEditorEngineProfiles,
} from '../hooks/useTextEditorEngineProfile';

import type {
  TextEditorEngineInstance,
  TextEditorEngineProfile,
  TextEditorEngineProfilesMap,
} from '../types';

const appearanceOptions = [
  {
    value: 'default',
    label: 'Default',
    description: 'Standard editor chrome used in Notes and Filemaker.',
  },
  {
    value: 'document-preview',
    label: 'Document Preview',
    description: 'Print-style page surface used for document drafting.',
  },
] as const;

type ProfileToggleField =
  | 'allowFontFamily'
  | 'allowTextAlign'
  | 'enableAdvancedTools'
  | 'allowImage'
  | 'allowTable'
  | 'allowTaskList';

const profileToggleMeta: Array<{
  key: ProfileToggleField;
  label: string;
  description: string;
}> = [
  {
    key: 'allowFontFamily',
    label: 'Allow Font Family',
    description: 'Shows the font-family selector in the toolbar.',
  },
  {
    key: 'allowTextAlign',
    label: 'Allow Text Align',
    description: 'Shows left, right, center, and justify alignment controls.',
  },
  {
    key: 'enableAdvancedTools',
    label: 'Enable Advanced Tools',
    description: 'Shows extra document tools such as paragraph, code block, and clear formatting.',
  },
  {
    key: 'allowImage',
    label: 'Allow Images',
    description: 'Keeps image insertion available in the editor toolbar.',
  },
  {
    key: 'allowTable',
    label: 'Allow Tables',
    description: 'Keeps table insertion available in the editor toolbar.',
  },
  {
    key: 'allowTaskList',
    label: 'Allow Task Lists',
    description: 'Keeps checklist and task list support enabled.',
  },
];

interface TextEditorSettingsContextValue {
  draftProfiles: TextEditorEngineProfilesMap;
  updateProfile: (
    instance: TextEditorEngineInstance,
    updater: (profile: TextEditorEngineProfile) => TextEditorEngineProfile
  ) => void;
  isSaving: boolean;
}

const TextEditorSettingsContext = React.createContext<TextEditorSettingsContextValue | null>(null);

function useTextEditorSettingsContext(): TextEditorSettingsContextValue {
  const context = React.useContext(TextEditorSettingsContext);
  if (!context) {
    throw new Error(
      'useTextEditorSettingsContext must be used within an AdminTextEditorSettingsPage'
    );
  }
  return context;
}

function InstanceSettingsPanel({
  id,
  title,
  description,
}: {
  id: TextEditorEngineInstance;
  title: string;
  description: string;
}): React.JSX.Element {
  const { draftProfiles, updateProfile } = useTextEditorSettingsContext();
  const profile = draftProfiles[id];

  return (
    <Card
      id={`text-editor-instance-${id}`}
      variant='subtle'
      padding='lg'
      className='scroll-mt-24 space-y-5 bg-card/40'
    >
      <SectionHeader title={title} description={description} size='xs' />

      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
        <FormField label='Surface Appearance'>
          <SelectSimple
            size='sm'
            value={profile.appearance}
            options={[...appearanceOptions]}
            onValueChange={(value: string): void => {
              updateProfile(id, (current) => ({
                ...current,
                appearance:
                  value === 'document-preview' ? 'document-preview' : 'default',
              }));
            }}
            placeholder='Choose appearance'
            ariaLabel='Choose editor surface appearance'
            title='Choose editor surface appearance'
          />
        </FormField>
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
        {profileToggleMeta.map((entry) => (
          <ToggleRow
            key={entry.key}
            label={entry.label}
            description={entry.description}
            checked={profile[entry.key]}
            onCheckedChange={(checked: boolean): void => {
              updateProfile(id, (current) => ({
                ...current,
                [entry.key]: checked,
              }));
            }}
            className='border-border/60 bg-card/20'
          />
        ))}
      </div>
    </Card>
  );
}

export function AdminTextEditorSettingsPage(): React.JSX.Element {
  const parsedProfiles = useTextEditorEngineProfiles();
  const updateSettingsBulk = useUpdateSettingsBulk();
  const { toast } = useToast();
  const mutationState = updateSettingsBulk as { isPending?: boolean };
  const isSaving = mutationState.isPending === true;

  const [draftProfiles, setDraftProfiles] = useState<TextEditorEngineProfilesMap>(parsedProfiles);

  useEffect(() => {
    setDraftProfiles(parsedProfiles);
  }, [parsedProfiles]);

  const isDirty = useMemo(
    () => JSON.stringify(draftProfiles) !== JSON.stringify(parsedProfiles),
    [draftProfiles, parsedProfiles]
  );

  const updateProfile = useCallback(
    (
      instance: TextEditorEngineInstance,
      updater: (profile: TextEditorEngineProfile) => TextEditorEngineProfile
    ): void => {
      setDraftProfiles((prev: TextEditorEngineProfilesMap) => ({
        ...prev,
        [instance]: updater(prev[instance]),
      }));
    },
    []
  );

  const handleSave = useCallback(async (): Promise<void> => {
    try {
      await updateSettingsBulk.mutateAsync(
        TEXT_EDITOR_INSTANCE_META.map((meta) => ({
          key: getTextEditorProfileKey(meta.id),
          value: serializeTextEditorProfileEntry(draftProfiles[meta.id]),
        }))
      );
      toast('Text editor profiles saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save text editor profiles.', {
        variant: 'error',
      });
    }
  }, [draftProfiles, toast, updateSettingsBulk]);

  const handleResetToDefaults = useCallback((): void => {
    setDraftProfiles(createDefaultTextEditorEngineProfiles());
  }, []);

  const handleRevert = useCallback((): void => {
    setDraftProfiles(parsedProfiles);
  }, [parsedProfiles]);

  return (
    <TextEditorSettingsContext.Provider value={{ draftProfiles, updateProfile, isSaving }}>
      <AdminSettingsPageLayout
        title='Text Editors'
        current='Text Editors'
        description='Configure reusable text editor engine instances shared by Notes App, Filemaker Email, and Case Resolver.'
      >
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
          {TEXT_EDITOR_INSTANCE_META.map((meta) => (
            <InstanceSettingsPanel
              key={meta.id}
              id={meta.id}
              title={meta.title}
              description={meta.description}
            />
          ))}
        </div>
      </AdminSettingsPageLayout>
    </TextEditorSettingsContext.Provider>
  );
}
