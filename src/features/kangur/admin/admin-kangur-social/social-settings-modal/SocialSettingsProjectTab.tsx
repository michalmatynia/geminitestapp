'use client';

import { FormField, Input } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '../../components/KangurAdminCard';

export function SocialSettingsProjectTab({
  projectUrl,
  setProjectUrl,
}: {
  projectUrl: string;
  setProjectUrl: (val: string) => void;
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
        />
      </FormField>
    </KangurAdminCard>
  );
}
