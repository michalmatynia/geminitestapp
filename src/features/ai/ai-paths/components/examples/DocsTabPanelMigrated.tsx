'use client';

import { useAiPathsSettingsOrchestrator } from '../ai-paths-settings/AiPathsSettingsOrchestratorContext';
import { DocsTabPanel } from '../ui-panels';

export type DocsTabPanelMigratedProps = Record<string, never>;

export function DocsTabPanelMigrated(
  _props: DocsTabPanelMigratedProps = {}
): React.JSX.Element {
  const {
    docsOverviewSnippet,
    docsWiringSnippet,
    docsDescriptionSnippet,
    docsJobsSnippet,
    handleCopyDocsWiring,
    handleCopyDocsDescription,
    handleCopyDocsJobs,
  } = useAiPathsSettingsOrchestrator();

  return (
    <DocsTabPanel
      docsOverviewSnippet={docsOverviewSnippet}
      docsWiringSnippet={docsWiringSnippet}
      docsDescriptionSnippet={docsDescriptionSnippet}
      docsJobsSnippet={docsJobsSnippet}
      onCopyDocsWiring={handleCopyDocsWiring}
      onCopyDocsDescription={handleCopyDocsDescription}
      onCopyDocsJobs={handleCopyDocsJobs}
    />
  );
}
