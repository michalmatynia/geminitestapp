import { useMemo } from 'react';
import type { CaseResolverNodeMeta, CaseResolverEdgeMeta, CaseResolverGraph } from '@/shared/contracts/case-resolver';
import { DEFAULT_CASE_RESOLVER_EDGE_META } from '@/shared/contracts/case-resolver/constants';
import { isObjectRecord } from '@/shared/utils/object-utils';

export function useGraphMetadata(activeFile: { graph?: CaseResolverGraph } | null | undefined): {
  normalizedNodeMeta: Record<string, CaseResolverNodeMeta>;
  normalizedEdgeMeta: Record<string, CaseResolverEdgeMeta>;
} {
  const normalizedNodeMeta = useMemo((): Record<string, CaseResolverNodeMeta> => {
    const value = activeFile?.graph?.nodeMeta;
    return isObjectRecord(value) ? value : {};
  }, [activeFile?.graph?.nodeMeta]);

  const normalizedEdgeMeta = useMemo((): Record<string, CaseResolverEdgeMeta> => {
    const value = activeFile?.graph?.edgeMeta;
    return isObjectRecord(value) ? value : {};
  }, [activeFile?.graph?.edgeMeta]);

  return { normalizedNodeMeta, normalizedEdgeMeta };
}

export function useSelectedNodeMeta(
  selectedNodeId: string | null,
  normalizedNodeMeta: Record<string, CaseResolverNodeMeta>
): CaseResolverNodeMeta | null {
  return useMemo(
    () => (selectedNodeId !== null && normalizedNodeMeta[selectedNodeId] !== undefined ? normalizedNodeMeta[selectedNodeId] : null),
    [normalizedNodeMeta, selectedNodeId]
  );
}

export function useSelectedEdgeMeta(
  selectedEdgeId: string | null,
  normalizedEdgeMeta: Record<string, CaseResolverEdgeMeta>
): CaseResolverEdgeMeta {
  return useMemo(
    () => (selectedEdgeId !== null && normalizedEdgeMeta[selectedEdgeId] !== undefined ? normalizedEdgeMeta[selectedEdgeId] : DEFAULT_CASE_RESOLVER_EDGE_META),
    [normalizedEdgeMeta, selectedEdgeId]
  );
}
