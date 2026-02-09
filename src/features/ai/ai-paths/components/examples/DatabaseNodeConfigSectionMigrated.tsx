'use client';

import type { DbNodePreset, DbQueryPreset, NodeConfig } from '@/features/ai/ai-paths/lib';

import { DatabaseNodeConfigSection } from '../node-config/DatabaseNodeConfigSection';

// Backward-compatibility surface for older callsites.
// DatabaseNodeConfigSection now reads all state/actions from context.
export type DatabaseNodeConfigSectionMigratedProps = {
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  onSendToAi?: ((databaseNodeId: string, prompt: string) => Promise<void>) | undefined;
  handleFetchUpdaterSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean }
  ) => Promise<void>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
  toast: (message: string, options?: { variant?: 'success' | 'error' }) => void;
};

export function DatabaseNodeConfigSectionMigrated(
  _props: DatabaseNodeConfigSectionMigratedProps
): React.JSX.Element | null {
  return <DatabaseNodeConfigSection />;
}
