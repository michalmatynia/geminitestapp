import { type CaseResolverGraph, type CaseResolverWorkspace, type CaseResolverFile } from '@/shared/contracts/case-resolver';

import {
  createEmptyNodeFileSnapshot,
  parseNodeFileSnapshot,
  serializeNodeFileSnapshot,
} from './node-file-snapshots';
import { sanitizeGraph } from './settings-graph';
import { normalizeCaseResolverWorkspace } from './settings.workspace';
export { createEmptyNodeFileSnapshot, parseNodeFileSnapshot, serializeNodeFileSnapshot };

export const upsertFileGraph = (
  workspace: CaseResolverWorkspace,
  fileId: string,
  graph: CaseResolverGraph
): CaseResolverWorkspace => {
  const nextFiles = workspace.files.map((file: CaseResolverFile): CaseResolverFile => {
    if (file.id !== fileId) return file;
    return {
      ...file,
      graph: sanitizeGraph(graph),
      updatedAt: new Date().toISOString(),
    };
  });

  return normalizeCaseResolverWorkspace({
    ...workspace,
    files: nextFiles,
  });
};
