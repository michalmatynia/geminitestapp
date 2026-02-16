'use client';

import Link from 'next/link';
import { useState, type ChangeEvent } from 'react';

import { CLIENT_LOGGING_KEYS } from '@/features/observability/public';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { Button, useToast, Textarea, SectionHeader, FormSection, FormField } from '@/shared/ui';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

export default function LoggingSettingsPage(): React.JSX.Element {
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
    <LoggingSettingsForm
      initialTags={JSON.stringify(tags ?? {}, null, 2)}
      initialFlags={JSON.stringify(flags ?? {}, null, 2)}
    />
  );
}

function LoggingSettingsForm({
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
      toast(error instanceof Error ? error.message : 'Failed to save settings.', {
        variant: 'error',
      });
    }
  };

  return (
    <div className='container mx-auto py-10 space-y-6'>
      <SectionHeader
        title='Logging Settings'
        description='Configure client logging context shared with error reports.'
        eyebrow={(
          <Link href='/admin/settings' className='text-blue-300 hover:text-blue-200'>
            ← Back to settings
          </Link>
        )}
      />

      <FormSection
        title='Client logging context'
        description='Provide feature flags and tags attached to client errors.'
        className='p-6'
      >
        <div className='grid gap-6 md:grid-cols-2'>
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
            description='Arbitrary metadata tags for categorizing error reports.'
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

        <div className='mt-6 flex items-center justify-between border-t border-border pt-6'>
          <p className='text-xs text-gray-500'>
            Changes will be included in subsequent client-side error payloads.
          </p>
          <Button
            onClick={() => void saveSettings()}
            disabled={!dirty || saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </FormSection>
    </div>
  );
}
