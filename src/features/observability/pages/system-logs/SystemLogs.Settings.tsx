'use client';

import { useState, type ChangeEvent } from 'react';

import { CLIENT_LOGGING_KEYS } from '@/shared/contracts/observability';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  Button,
  FormField,
  FormSection,
  Textarea,
  UI_GRID_ROOMY_CLASSNAME,
  useToast,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

function ObservationPostSettingsForm({
  initialTags,
  initialFlags,
}: {
  initialTags: string;
  initialFlags: string;
}): React.JSX.Element {
  const { toast } = useToast();
  const [clientTags, setClientTags] = useState(initialTags);
  const [clientFlags, setClientFlags] = useState(initialFlags);
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
      title='Client logging context'
      description='Provide feature flags and tags attached to client errors.'
      className='p-6'
    >
      <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
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

  return (
    <ObservationPostSettingsForm
      initialTags={JSON.stringify(tags ?? {}, null, 2)}
      initialFlags={JSON.stringify(flags ?? {}, null, 2)}
    />
  );
}

export default ObservationPostSettingsPanel;
