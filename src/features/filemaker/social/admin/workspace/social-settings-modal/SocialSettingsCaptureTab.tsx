'use client';

import type React from 'react';

import { SocialSettingsBatchCaptureCard } from './SocialSettingsBatchCaptureCard';
import { SocialSettingsCaptureRuntimeJobsCard } from './SocialSettingsCaptureRuntimeJobsCard';
import { SocialSettingsCaptureSingleAddonCard } from './SocialSettingsCaptureSingleAddonCard';
import { SocialSettingsProgrammableDefaultsCard } from './SocialSettingsProgrammableDefaultsCard';

export function SocialSettingsCaptureTab(): React.ReactElement {
  return (
    <div className='space-y-4'>
      <SocialSettingsCaptureRuntimeJobsCard />
      <SocialSettingsCaptureSingleAddonCard />
      <SocialSettingsProgrammableDefaultsCard />
      <SocialSettingsBatchCaptureCard />
    </div>
  );
}
