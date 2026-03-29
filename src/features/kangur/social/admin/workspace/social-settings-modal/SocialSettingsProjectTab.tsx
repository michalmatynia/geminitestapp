'use client';

import { FormField, Input } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';

export function SocialSettingsProjectTab({
  projectUrl,
  setProjectUrl,
  isRuntimeLocked,
}: {
  projectUrl: string;
  setProjectUrl: (val: string) => void;
  isRuntimeLocked?: boolean;
}) {
  return (
    <KangurAdminCard>
      <FormField label='Project URL' description='Current project link to reference in generated posts.'>
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
