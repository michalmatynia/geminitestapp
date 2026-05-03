'use client';

import type { TransientRecoverySettings } from '@/shared/contracts/observability';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import {
  DEFAULT_TRANSIENT_RECOVERY_SETTINGS,
  TRANSIENT_RECOVERY_KEYS,
} from '@/shared/lib/observability/transient-recovery/constants';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { TransientRecoverySettingsForm } from './admin-transient-recovery-settings-form';

function buildInitialTransientRecoverySettings(
  stored: TransientRecoverySettings | null
): TransientRecoverySettings {
  if (stored === null) {
    return DEFAULT_TRANSIENT_RECOVERY_SETTINGS;
  }

  return {
    enabled: stored.enabled,
    retry: {
      ...stored.retry,
      timeoutMs: stored.retry.timeoutMs ?? 0,
    },
    circuit: stored.circuit,
  };
}

export default function AdminTransientRecoverySettingsPage(): React.JSX.Element {
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isLoading || settingsQuery.data === undefined) {
    return <div className='p-10 text-center text-gray-400'>Loading settings...</div>;
  }

  const stored = parseJsonSetting<TransientRecoverySettings | null>(
    settingsQuery.data.get(TRANSIENT_RECOVERY_KEYS.settings),
    null
  );
  const initialSettings = buildInitialTransientRecoverySettings(stored);

  return (
    <TransientRecoverySettingsForm
      initialSettings={initialSettings}
      isPending={settingsQuery.isPending}
      recoveryKeys={TRANSIENT_RECOVERY_KEYS}
    />
  );
}
