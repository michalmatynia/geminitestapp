'use client';
import { useState, ChangeEvent } from 'react';


import { CLIENT_LOGGING_KEYS } from '@/features/observability';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { Button, useToast, Textarea, Label } from '@/shared/ui';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';


export default function LoggingSettingsPage() {
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return <div className="p-10 text-center text-gray-400">Loading settings...</div>;
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
}) {
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
    <div className="container mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Logging Settings</h1>
        <p className="mt-2 text-sm text-gray-400">
          Configure client logging context shared with error reports.
        </p>
      </div>

      <div className="rounded-md border border-gray-800 bg-gray-950 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Client logging context</h2>
            <p className="mt-1 text-xs text-gray-400">
              Provide feature flags and tags attached to client errors.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => void saveSettings()}
            disabled={!dirty || saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Feature flags (JSON)</Label>
            <Textarea
              className="min-h-[180px] w-full rounded-md border border-gray-800 bg-gray-900 p-2 text-xs text-gray-200"
              value={clientFlags}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                setClientFlags(event.target.value);
                setDirty(true);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Tags (JSON)</Label>
            <Textarea
              className="min-h-[180px] w-full rounded-md border border-gray-800 bg-gray-900 p-2 text-xs text-gray-200"
              value={clientTags}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                setClientTags(event.target.value);
                setDirty(true);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
