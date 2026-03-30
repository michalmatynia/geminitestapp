'use client';

import { FormField, Input } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';

export function SocialSettingsProjectTab({
  projectUrl,
  projectUrlError,
  setProjectUrl,
  isRuntimeLocked,
}: {
  projectUrl: string;
  projectUrlError: string | null;
  setProjectUrl: (val: string) => void;
  isRuntimeLocked?: boolean;
}) {
  return (
    <KangurAdminCard>
      <FormField
        label='Project URL'
        description='Used for all links and redirects in generated social posts. Localhost and loopback URLs are rejected.'
        error={projectUrlError}
      >
        <Input
          type='url'
          value={projectUrl}
          onChange={(event) => setProjectUrl(event.target.value)}
          placeholder='https://example.com/project'
          size='sm'
          aria-label='Project URL'
          disabled={isRuntimeLocked}
          title={isRuntimeLocked ? 'Wait for the current Social runtime job to finish.' : 'Project URL'}
        />
      </FormField>
    </KangurAdminCard>
  );
}
