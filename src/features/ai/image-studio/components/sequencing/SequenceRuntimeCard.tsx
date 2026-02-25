'use client';

import React, { useCallback } from 'react';
import { ToggleRow, Hint } from '@/shared/ui';
import { StudioCard } from '../StudioCard';
import { useSettingsState, useSettingsActions } from '../../context/SettingsContext';

export function SequenceRuntimeCard(): React.JSX.Element {
  const { studioSettings } = useSettingsState();
  const { setStudioSettings } = useSettingsActions();

  const handleToggleSequencingEnabled = useCallback((checked: boolean): void => {
    setStudioSettings((prev) => {
      return {
        ...prev,
        projectSequencing: {
          ...prev.projectSequencing,
          enabled: Boolean(checked),
        },
      };
    });
  }, [setStudioSettings]);

  return (
    <StudioCard label='Sequencing Runtime' className='shrink-0'>
      <div className='space-y-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <ToggleRow
            label='Enable Sequencing'
            checked={studioSettings.projectSequencing.enabled}
            onCheckedChange={handleToggleSequencingEnabled}
            className='bg-transparent border-none p-0 hover:bg-transparent'
          />
          <Hint size='xxs' className='text-gray-500'>
            Trigger: {studioSettings.projectSequencing.trigger}
          </Hint>
          <Hint size='xxs' className='text-gray-500'>
            Runtime: {studioSettings.projectSequencing.runtime}
          </Hint>
        </div>
      </div>
    </StudioCard>
  );
}
