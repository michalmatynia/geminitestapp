'use client';

import { CLIENT_LOGGING_KEYS } from '@/features/observability/public';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { LoggingSettingsForm } from './logging-settings-form';

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
