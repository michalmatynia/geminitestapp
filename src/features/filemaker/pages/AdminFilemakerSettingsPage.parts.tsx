import { UserRound } from 'lucide-react';
import type React from 'react';

import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import {
  FormActions,
  FormField,
  FormSection,
  SelectSimple,
} from '@/shared/ui/forms-and-actions.public';
import {
  MetadataItem,
  UI_GRID_ROOMY_CLASSNAME,
} from '@/shared/ui/navigation-and-layout.public';
import { Badge, Input } from '@/shared/ui/primitives.public';

import {
  FILEMAKER_JOB_APPLICATION_SETTINGS_KEY,
  type FilemakerJobApplicationSettings,
} from '../filemaker-job-application-settings';
import {
  getSelectedPersonValue,
  type PersonOptionsState,
} from './AdminFilemakerSettingsPage.options';
import type { AdminFilemakerSettingsPageState } from './AdminFilemakerSettingsPage.state';

export function FilemakerSettingsShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <AdminSettingsPageLayout
      title='Filemaker Settings'
      current='Filemaker Settings'
      description='Configure Filemaker workflow defaults.'
    >
      {children}
    </AdminSettingsPageLayout>
  );
}

function FilemakerJobApplicationSettingsPreview(props: {
  personOptions: AdminFilemakerSettingsPageState['personOptions'];
  settings: FilemakerJobApplicationSettings;
}): React.JSX.Element {
  const { personOptions, settings } = props;
  const selectedOption =
    personOptions.find((option) => option.value === settings.defaultPersonId.trim()) ?? null;
  const storedPersonName = settings.defaultPersonName.trim();
  const selectedPersonLabel =
    selectedOption?.label ??
    (storedPersonName.length > 0 ? storedPersonName : settings.defaultPersonId.trim());

  return (
    <FormSection title='Current Default' className='sticky top-6 space-y-4 p-6'>
      <div className='flex items-start gap-3 rounded border border-border bg-muted/20 p-4'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-card/70'>
          <UserRound className='size-4 text-blue-300' aria-hidden='true' />
        </div>
        <div className='min-w-0 space-y-1'>
          <div className='text-sm font-semibold text-white'>
            {settings.defaultPersonId.trim().length > 0 ? selectedPersonLabel : 'No default person'}
          </div>
          <div className='text-xs text-gray-500'>
            {settings.defaultPersonId.trim().length > 0
              ? settings.defaultPersonId
              : 'Prepare modal will fall back to integration defaults.'}
          </div>
        </div>
      </div>
      <div className='space-y-2 text-xs text-gray-400'>
        <MetadataItem
          label='Setting Key'
          value={FILEMAKER_JOB_APPLICATION_SETTINGS_KEY}
          mono
          variant='minimal'
        />
        <MetadataItem label='Loaded Persons' value={personOptions.length - 1} variant='minimal' />
      </div>
    </FormSection>
  );
}

const renderPersonOptionsStatus = (state: PersonOptionsState): React.ReactNode => {
  if (state.isLoading) return <span>Loading persons...</span>;
  if (state.error !== null) return <span className='text-red-300'>{state.error}</span>;
  return <Badge variant='outline'>{state.options.length} persons loaded</Badge>;
};

function DefaultPersonField(props: {
  onPersonChange: (value: string) => void;
  personOptions: AdminFilemakerSettingsPageState['personOptions'];
  personOptionsState: PersonOptionsState;
  personQuery: string;
  setPersonQuery: React.Dispatch<React.SetStateAction<string>>;
  settings: FilemakerJobApplicationSettings;
}): React.JSX.Element {
  const { onPersonChange, personOptions, personOptionsState, personQuery, setPersonQuery, settings } =
    props;

  return (
    <FormField label='Default person' description='Preselected in the job listing Prepare modal.'>
      <div className='space-y-2'>
        <Input
          variant='subtle'
          size='sm'
          placeholder='Search Persons'
          value={personQuery}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setPersonQuery(event.target.value)
          }
          aria-label='Search default job application person'
          title='Search default job application person'
        />
        <SelectSimple
          size='sm'
          value={getSelectedPersonValue(settings)}
          onValueChange={onPersonChange}
          options={personOptions}
          placeholder='Select default person'
          ariaLabel='Default job application person'
          title='Default job application person'
          disabled={personOptionsState.isLoading}
        />
      </div>
    </FormField>
  );
}

export function FilemakerJobApplicationSettingsForm(
  props: AdminFilemakerSettingsPageState
): React.JSX.Element {
  const {
    handlePersonChange,
    handleReset,
    handleSave,
    isDirty,
    isSaving,
    personOptions,
    personOptionsState,
    personQuery,
    setPersonQuery,
    settings,
  } = props;

  return (
    <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-3`}>
      <div className='space-y-6 lg:col-span-2'>
        <FormSection title='Job Application Defaults' className='space-y-4 p-6'>
          <DefaultPersonField
            onPersonChange={handlePersonChange}
            personOptions={personOptions}
            personOptionsState={personOptionsState}
            personQuery={personQuery}
            setPersonQuery={setPersonQuery}
            settings={settings}
          />
          <div className='flex flex-wrap items-center gap-2 text-xs text-gray-500'>
            {renderPersonOptionsStatus(personOptionsState)}
          </div>
        </FormSection>
        <FormActions
          onSave={handleSave}
          onCancel={handleReset}
          saveText='Save Settings'
          cancelText='Reset'
          isDisabled={!isDirty || isSaving}
          isSaving={isSaving}
          className='justify-start'
        />
      </div>
      <FilemakerJobApplicationSettingsPreview personOptions={personOptions} settings={settings} />
    </div>
  );
}
