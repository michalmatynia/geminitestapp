'use client';

import { useState, type ChangeEvent } from 'react';

import {
  CLIENT_LOGGING_KEYS,
  type ObservabilityLoggingControls,
  OBSERVABILITY_LOGGING_KEYS,
} from '@/shared/contracts/observability';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { resolveObservabilityLoggingControls } from '@/shared/lib/observability/logging-controls';
import { Button, Textarea, useToast } from '@/shared/ui/primitives.public';
import { FormField, FormSection, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

function ObservationPostSettingsForm({
  initialTags,
  initialFlags,
  initialControls,
}: {
  initialTags: string;
  initialFlags: string;
  initialControls: ObservabilityLoggingControls;
}): React.JSX.Element {
  const { toast } = useToast();
  const [clientTags, setClientTags] = useState(initialTags);
  const [clientFlags, setClientFlags] = useState(initialFlags);
  const [infoLoggingEnabled, setInfoLoggingEnabled] = useState(initialControls.infoEnabled);
  const [activityLoggingEnabled, setActivityLoggingEnabled] = useState(
    initialControls.activityEnabled
  );
  const [errorLoggingEnabled, setErrorLoggingEnabled] = useState(initialControls.errorEnabled);
  const [dirty, setDirty] = useState(false);

  const saveSettingsMutation = useUpdateSettingsBulk();

  const saveSettings = async (): Promise<void> => {
    try {
      const parsedTags = clientTags.trim()
        ? (JSON.parse(clientTags) as Record<string, unknown>)
        : {};
      const parsedFlags = clientFlags.trim()
        ? (JSON.parse(clientFlags) as Record<string, unknown>)
        : {};

      await saveSettingsMutation.mutateAsync([
        {
          key: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
          value: serializeSetting(infoLoggingEnabled),
        },
        {
          key: OBSERVABILITY_LOGGING_KEYS.activityEnabled,
          value: serializeSetting(activityLoggingEnabled),
        },
        {
          key: OBSERVABILITY_LOGGING_KEYS.errorEnabled,
          value: serializeSetting(errorLoggingEnabled),
        },
        {
          key: CLIENT_LOGGING_KEYS.tags,
          value: serializeSetting(parsedTags),
        },
        {
          key: CLIENT_LOGGING_KEYS.featureFlags,
          value: serializeSetting(parsedFlags),
        },
      ]);

      setDirty(false);
      toast('Logging settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save settings.', {
        variant: 'error',
      });
    }
  };

  return (
    <FormSection
      title='Observation Post logging settings'
      description='Control observability logging and attach feature flags and tags to client diagnostics.'
      className='p-6'
    >
      <div className='grid gap-4 md:grid-cols-3'>
        <ToggleRow
          id='info-logging-enabled'
          label='Info logging'
          description='Controls info-level system log events across the application.'
          variant='switch'
          checked={infoLoggingEnabled}
          onCheckedChange={(checked: boolean) => {
            setInfoLoggingEnabled(checked);
            setDirty(true);
          }}
        />
        <ToggleRow
          id='activity-logging-enabled'
          label='Activity logging'
          description='Controls persisted activity records such as auth and entity events.'
          variant='switch'
          checked={activityLoggingEnabled}
          onCheckedChange={(checked: boolean) => {
            setActivityLoggingEnabled(checked);
            setDirty(true);
          }}
        />
        <ToggleRow
          id='error-logging-enabled'
          label='Error logging'
          description='Controls warning and error diagnostics, including client error reports.'
          variant='switch'
          checked={errorLoggingEnabled}
          onCheckedChange={(checked: boolean) => {
            setErrorLoggingEnabled(checked);
            setDirty(true);
          }}
        />
      </div>
      <div className={`mt-6 ${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
        <FormField
          label='Feature flags (JSON)'
          description='Key-value pairs representing active experiment flags.'
        >
          <Textarea
            className='min-h-[240px] font-mono text-[11px]'
            value={clientFlags}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              setClientFlags(event.target.value);
              setDirty(true);
            }}
          />
        </FormField>
        <FormField
          label='Tags (JSON)'
          description='Context tags attached to error reports and logs.'
        >
          <Textarea
            className='min-h-[240px] font-mono text-[11px]'
            value={clientTags}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              setClientTags(event.target.value);
              setDirty(true);
            }}
          />
        </FormField>
      </div>
      <div className='mt-6 flex justify-end'>
        <Button
          type='button'
          onClick={() => void saveSettings()}
          disabled={!dirty || saveSettingsMutation.isPending}
        >
          Save settings
        </Button>
      </div>
    </FormSection>
  );
}

export function ObservationPostSettingsPanel(): React.JSX.Element {
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return <div className='p-10 text-center text-gray-400'>Loading settings...</div>;
  }

  const tags = parseJsonSetting<Record<string, unknown> | null>(
    settingsQuery.data.get(CLIENT_LOGGING_KEYS.tags),
    null
  );
  const flags = parseJsonSetting<Record<string, unknown> | null>(
    settingsQuery.data.get(CLIENT_LOGGING_KEYS.featureFlags),
    null
  );
  const controls = resolveObservabilityLoggingControls((key: string) =>
    settingsQuery.data.get(key)
  );

  return (
    <ObservationPostSettingsForm
      initialTags={JSON.stringify(tags ?? {}, null, 2)}
      initialFlags={JSON.stringify(flags ?? {}, null, 2)}
      initialControls={controls}
    />
  );
}

export default ObservationPostSettingsPanel;
