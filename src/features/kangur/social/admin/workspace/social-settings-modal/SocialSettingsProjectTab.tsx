import { FormField, Input } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import { useSocialPostContext } from '../SocialPostContext';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function SocialSettingsProjectTab() {
  const {
    projectUrl,
    projectUrlError,
    setProjectUrl,
    currentGenerationJob,
    currentPipelineJob,
    currentVisualAnalysisJob,
  } = useSocialPostContext();

  const isRuntimeLocked =
    isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) ||
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);

  return (
    <KangurAdminCard>
      <FormField
        label='Project URL'
        description='Used for all links and redirects in generated social posts. Localhost and loopback URLs are rejected.'
        error={projectUrlError ?? null}
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
