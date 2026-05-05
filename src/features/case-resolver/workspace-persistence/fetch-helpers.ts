import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';

export const resolveDetachedPayloadRequiredFileId = ({
  workspace,
  requiredFileId,
}: {
  workspace: CaseResolverWorkspace;
  requiredFileId: string;
}): string => {
  if (requiredFileId.length === 0) return '';
  const requiredFile = workspace.files.find((file): boolean => file.id === requiredFileId);
  if (!requiredFile) return requiredFileId;
  if (requiredFile.fileType === 'document' || requiredFile.fileType === 'scanfile') {
    return requiredFileId;
  }
  return '';
};
