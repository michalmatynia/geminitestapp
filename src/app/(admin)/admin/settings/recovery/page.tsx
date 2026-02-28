'use client';

import { useEffect, useState } from 'react';

import { useSettingsMap } from '@/shared/hooks/use-settings';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  TransientRecoverySettingsForm,
  type TransientRecoverySettings,
} from './transient-recovery-settings-form';
import {
  buildInitialTransientRecoverySettings,
  loadTransientRecoveryConstants,
  type TransientRecoveryConstants,
} from './transient-recovery-settings-utils';

export default function TransientRecoverySettingsPage(): React.JSX.Element {
  const [constants, setConstants] = useState<TransientRecoveryConstants | null>(null);
  const settingsQuery = useSettingsMap();

  useEffect(() => {
    const loadConstants = async () => {
      const loadedConstants = await loadTransientRecoveryConstants();
      setConstants(loadedConstants);
    };
    void loadConstants();
  }, []);

  if (settingsQuery.isLoading || !settingsQuery.data || !constants) {
    return <div className='p-10 text-center text-gray-400'>Loading settings...</div>;
  }

  const stored = parseJsonSetting<TransientRecoverySettings | null>(
    settingsQuery.data.get(constants.TRANSIENT_RECOVERY_KEYS.settings),
    null
  );
  const initialSettings: TransientRecoverySettings = buildInitialTransientRecoverySettings({
    stored,
    defaults: constants.DEFAULT_TRANSIENT_RECOVERY_SETTINGS,
  });

  return (
    <TransientRecoverySettingsForm
      initialSettings={initialSettings}
      recoveryKeys={constants.TRANSIENT_RECOVERY_KEYS}
    />
  );
}
