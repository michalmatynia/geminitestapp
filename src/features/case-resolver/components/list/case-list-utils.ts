import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { getFolderTreeInstanceSettingsHref } from '@/shared/utils/folder-tree-profiles-v2';
import { fromCaseResolverCaseNodeId } from '@/features/case-resolver/master-tree';

export const parseBoolean = (value: unknown): boolean => value === true;
export const CASE_RESOLVER_CASES_MASTER_INSTANCE = 'case_resolver_case_hierarchy';
export const CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF =
  getFolderTreeInstanceSettingsHref(CASE_RESOLVER_CASES_MASTER_INSTANCE);
export const buildCaseResolverCaseHref = (caseId: string): string =>
  `/admin/case-resolver?fileId=${encodeURIComponent(caseId)}`;

export const parseTimestampMs = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const resolveCaseStatusRank = (
  status: CaseResolverFile['caseStatus'] | null | undefined
): number => (status === 'completed' ? 1 : 0);

export const resolveBinaryRank = (value: boolean | null | undefined): number =>
  value === true ? 1 : 0;

export const resolveSignatureLabel = (
  file: CaseResolverFile | null,
  caseIdentifierPathById: Map<string, string>
): string => {
  if (!file?.caseIdentifierId) return '';
  return caseIdentifierPathById.get(file.caseIdentifierId)?.trim() ?? '';
};

export const resolveCaseTreeOrderValue = (file: CaseResolverFile | null): number =>
  file && typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
    ? Math.max(0, Math.floor(file.caseTreeOrder))
    : Number.MAX_SAFE_INTEGER;

const resolveNodeHappeningDateMs = (
  node: MasterTreeNode,
  file: CaseResolverFile | null
): { timestampMs: number; hasValue: boolean } => {
  if (file) {
    const happeningDateValue = file.happeningDate?.trim() ?? '';
    if (happeningDateValue.length > 0) {
      const parsed = Date.parse(happeningDateValue);
      if (Number.isFinite(parsed)) {
        return { timestampMs: parsed, hasValue: true };
      }
    }
  }

  const metadata = node.metadata && typeof node.metadata === 'object' ? node.metadata : null;
  const happeningDate =
    typeof metadata?.['happeningDate'] === 'string' ? metadata['happeningDate'] : null;
  if (!happeningDate) return { timestampMs: 0, hasValue: false };
  const parsed = Date.parse(happeningDate);
  if (!Number.isFinite(parsed)) return { timestampMs: 0, hasValue: false };
  return { timestampMs: parsed, hasValue: true };
};

export const CASE_ROW_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatCaseTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return CASE_ROW_TIMESTAMP_FORMATTER.format(parsed);
};

export const sortCaseTreeNodes = ({
  nodes,
  filesById,
  caseIdentifierPathById,
  sortBy,
  sortOrder,
}: {
  nodes: MasterTreeNode[];
  filesById: Map<string, CaseResolverFile>;
  caseIdentifierPathById: Map<string, string>;
  sortBy:
    | 'updated'
    | 'created'
    | 'happeningDate'
    | 'name'
    | 'status'
    | 'signature'
    | 'locked'
    | 'sent';
  sortOrder: 'asc' | 'desc';
}): MasterTreeNode[] => {
  const resolveNodeTimestamp = (node: MasterTreeNode, key: 'created' | 'updated'): number => {
    const caseId = fromCaseResolverCaseNodeId(node.id);
    const caseFile = caseId ? (filesById.get(caseId) ?? null) : null;
    if (caseFile) {
      return key === 'updated'
        ? parseTimestampMs(caseFile.updatedAt ?? caseFile.createdAt)
        : parseTimestampMs(caseFile.createdAt);
    }
    const metadata = node.metadata && typeof node.metadata === 'object' ? node.metadata : null;
    const createdAt = typeof metadata?.['createdAt'] === 'string' ? metadata['createdAt'] : null;
    const updatedAt = typeof metadata?.['updatedAt'] === 'string' ? metadata['updatedAt'] : null;
    return key === 'updated'
      ? parseTimestampMs(updatedAt ?? createdAt)
      : parseTimestampMs(createdAt);
  };

  const sortedIndexByNodeId = new Map<string, number>();
  const nodesByParentId = new Map<string | null, MasterTreeNode[]>();
  nodes.forEach((node: MasterTreeNode): void => {
    const parentId = node.parentId ?? null;
    const current = nodesByParentId.get(parentId) ?? [];
    current.push(node);
    nodesByParentId.set(parentId, current);
  });

  const direction = sortOrder === 'asc' ? 1 : -1;
  nodesByParentId.forEach((siblings: MasterTreeNode[]): void => {
    const orderedSiblings = [...siblings].sort(
      (left: MasterTreeNode, right: MasterTreeNode): number => {
        const leftCaseId = fromCaseResolverCaseNodeId(left.id);
        const rightCaseId = fromCaseResolverCaseNodeId(right.id);
        const leftCaseFile = leftCaseId ? (filesById.get(leftCaseId) ?? null) : null;
        const rightCaseFile = rightCaseId ? (filesById.get(rightCaseId) ?? null) : null;

        if (sortBy === 'name') {
          const nameDelta = left.name.localeCompare(right.name);
          if (nameDelta !== 0) return nameDelta * direction;
        } else if (sortBy === 'created') {
          const createdDelta =
            resolveNodeTimestamp(left, 'created') - resolveNodeTimestamp(right, 'created');
          if (createdDelta !== 0) return createdDelta * direction;
        } else if (sortBy === 'happeningDate') {
          const leftHappeningDate = resolveNodeHappeningDateMs(left, leftCaseFile);
          const rightHappeningDate = resolveNodeHappeningDateMs(right, rightCaseFile);
          if (leftHappeningDate.hasValue !== rightHappeningDate.hasValue) {
            return leftHappeningDate.hasValue ? -1 : 1;
          }
          if (leftHappeningDate.hasValue && rightHappeningDate.hasValue) {
            const happeningDateDelta =
              leftHappeningDate.timestampMs - rightHappeningDate.timestampMs;
            if (happeningDateDelta !== 0) return happeningDateDelta * direction;
          }
        } else if (sortBy === 'updated') {
          const updatedDelta =
            resolveNodeTimestamp(left, 'updated') - resolveNodeTimestamp(right, 'updated');
          if (updatedDelta !== 0) return updatedDelta * direction;
        } else if (sortBy === 'status') {
          const statusDelta =
            resolveCaseStatusRank(leftCaseFile?.caseStatus) -
            resolveCaseStatusRank(rightCaseFile?.caseStatus);
          if (statusDelta !== 0) return statusDelta * direction;
        } else if (sortBy === 'signature') {
          const leftSignatureLabel = resolveSignatureLabel(leftCaseFile, caseIdentifierPathById);
          const rightSignatureLabel = resolveSignatureLabel(rightCaseFile, caseIdentifierPathById);
          const leftIsEmpty = leftSignatureLabel.length === 0;
          const rightIsEmpty = rightSignatureLabel.length === 0;
          if (leftIsEmpty !== rightIsEmpty) {
            if (sortOrder === 'asc') return leftIsEmpty ? 1 : -1;
            return leftIsEmpty ? -1 : 1;
          }
          if (!leftIsEmpty && !rightIsEmpty) {
            const signatureDelta = leftSignatureLabel.localeCompare(rightSignatureLabel);
            if (signatureDelta !== 0) return signatureDelta * direction;
          }
        } else if (sortBy === 'locked') {
          const lockedDelta =
            resolveBinaryRank(leftCaseFile?.isLocked) - resolveBinaryRank(rightCaseFile?.isLocked);
          if (lockedDelta !== 0) return lockedDelta * direction;
        } else if (sortBy === 'sent') {
          const sentDelta =
            resolveBinaryRank(leftCaseFile?.isSent) - resolveBinaryRank(rightCaseFile?.isSent);
          if (sentDelta !== 0) return sentDelta * direction;
        }

        const orderDelta =
          resolveCaseTreeOrderValue(leftCaseFile) - resolveCaseTreeOrderValue(rightCaseFile);
        if (orderDelta !== 0) return orderDelta;
        const nameDelta = left.name.localeCompare(right.name);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      }
    );
    orderedSiblings.forEach((node: MasterTreeNode, index: number): void => {
      sortedIndexByNodeId.set(node.id, index);
    });
  });

  return nodes.map((node: MasterTreeNode): MasterTreeNode => {
    const sortIndex = sortedIndexByNodeId.get(node.id);
    if (sortIndex === undefined || sortIndex === node.sortOrder) return node;
    return {
      ...node,
      sortOrder: sortIndex,
    };
  });
};
