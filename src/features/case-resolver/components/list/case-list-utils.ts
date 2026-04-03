import { fromCaseResolverCaseNodeId } from '@/features/case-resolver/master-tree';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import { getFolderTreeInstanceSettingsHref } from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

export const parseBoolean = (value: unknown): boolean => value === true;
export const CASE_RESOLVER_CASES_MASTER_INSTANCE = 'case_resolver_case_hierarchy';
export const CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF = getFolderTreeInstanceSettingsHref(
  CASE_RESOLVER_CASES_MASTER_INSTANCE
);
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

type CaseTreeNodeSortBy =
  | 'updated'
  | 'created'
  | 'happeningDate'
  | 'name'
  | 'status'
  | 'signature'
  | 'locked'
  | 'sent';

type CaseTreeNodeComparable = {
  node: MasterTreeNode;
  caseFile: CaseResolverFile | null;
};

type CaseTreeSiblingComparisonInput = {
  left: CaseTreeNodeComparable;
  right: CaseTreeNodeComparable;
  caseIdentifierPathById: Map<string, string>;
  direction: 1 | -1;
  sortOrder: 'asc' | 'desc';
};

type CaseTreeSiblingComparator = (input: CaseTreeSiblingComparisonInput) => number;

const readCaseTreeNodeMetadata = (node: MasterTreeNode): Record<string, unknown> | null => {
  const metadata = node.metadata;
  return metadata && typeof metadata === 'object' ? metadata : null;
};

const resolveCaseTreeNodeFile = (
  node: MasterTreeNode,
  filesById: Map<string, CaseResolverFile>
): CaseResolverFile | null => {
  const caseId = fromCaseResolverCaseNodeId(node.id);
  return caseId ? (filesById.get(caseId) ?? null) : null;
};

const resolveCaseTreeNodeTimestamp = (
  comparable: CaseTreeNodeComparable,
  key: 'created' | 'updated'
): number => {
  if (comparable.caseFile) {
    return key === 'updated'
      ? parseTimestampMs(comparable.caseFile.updatedAt ?? comparable.caseFile.createdAt)
      : parseTimestampMs(comparable.caseFile.createdAt);
  }

  const metadata = readCaseTreeNodeMetadata(comparable.node);
  const createdAt = typeof metadata?.['createdAt'] === 'string' ? metadata['createdAt'] : null;
  const updatedAt = typeof metadata?.['updatedAt'] === 'string' ? metadata['updatedAt'] : null;
  return key === 'updated'
    ? parseTimestampMs(updatedAt ?? createdAt)
    : parseTimestampMs(createdAt);
};

const compareCaseTreeSiblingName: CaseTreeSiblingComparator = ({ left, right, direction }) => {
  const delta = left.node.name.localeCompare(right.node.name);
  return delta === 0 ? 0 : delta * direction;
};

const compareCaseTreeSiblingTimestamp = (
  input: CaseTreeSiblingComparisonInput,
  key: 'created' | 'updated'
): number => {
  const delta =
    resolveCaseTreeNodeTimestamp(input.left, key) - resolveCaseTreeNodeTimestamp(input.right, key);
  return delta === 0 ? 0 : delta * input.direction;
};

const compareCaseTreeSiblingHappeningDate: CaseTreeSiblingComparator = ({
  left,
  right,
  direction,
}) => {
  const leftHappeningDate = resolveNodeHappeningDateMs(left.node, left.caseFile);
  const rightHappeningDate = resolveNodeHappeningDateMs(right.node, right.caseFile);
  if (leftHappeningDate.hasValue !== rightHappeningDate.hasValue) {
    return leftHappeningDate.hasValue ? -1 : 1;
  }
  if (!leftHappeningDate.hasValue || !rightHappeningDate.hasValue) return 0;
  const delta = leftHappeningDate.timestampMs - rightHappeningDate.timestampMs;
  return delta === 0 ? 0 : delta * direction;
};

const compareCaseTreeSiblingStatus: CaseTreeSiblingComparator = ({ left, right, direction }) => {
  const delta =
    resolveCaseStatusRank(left.caseFile?.caseStatus) -
    resolveCaseStatusRank(right.caseFile?.caseStatus);
  return delta === 0 ? 0 : delta * direction;
};

const compareCaseTreeSiblingSignature: CaseTreeSiblingComparator = ({
  left,
  right,
  caseIdentifierPathById,
  direction,
  sortOrder,
}) => {
  const leftSignatureLabel = resolveSignatureLabel(left.caseFile, caseIdentifierPathById);
  const rightSignatureLabel = resolveSignatureLabel(right.caseFile, caseIdentifierPathById);
  const leftIsEmpty = leftSignatureLabel.length === 0;
  const rightIsEmpty = rightSignatureLabel.length === 0;
  if (leftIsEmpty !== rightIsEmpty) {
    if (sortOrder === 'asc') return leftIsEmpty ? 1 : -1;
    return leftIsEmpty ? -1 : 1;
  }
  if (leftIsEmpty || rightIsEmpty) return 0;
  const delta = leftSignatureLabel.localeCompare(rightSignatureLabel);
  return delta === 0 ? 0 : delta * direction;
};

const compareCaseTreeSiblingFlag = (
  input: CaseTreeSiblingComparisonInput,
  key: 'isLocked' | 'isSent'
): number => {
  const delta =
    resolveBinaryRank(input.left.caseFile?.[key]) - resolveBinaryRank(input.right.caseFile?.[key]);
  return delta === 0 ? 0 : delta * input.direction;
};

const compareCaseTreeSiblingFallback = (
  left: CaseTreeNodeComparable,
  right: CaseTreeNodeComparable
): number => {
  const orderDelta =
    resolveCaseTreeOrderValue(left.caseFile) - resolveCaseTreeOrderValue(right.caseFile);
  if (orderDelta !== 0) return orderDelta;
  const nameDelta = left.node.name.localeCompare(right.node.name);
  if (nameDelta !== 0) return nameDelta;
  return left.node.id.localeCompare(right.node.id);
};

const CASE_TREE_SIBLING_COMPARATORS: Record<CaseTreeNodeSortBy, CaseTreeSiblingComparator> = {
  name: compareCaseTreeSiblingName,
  created: (input: CaseTreeSiblingComparisonInput): number =>
    compareCaseTreeSiblingTimestamp(input, 'created'),
  happeningDate: compareCaseTreeSiblingHappeningDate,
  updated: (input: CaseTreeSiblingComparisonInput): number =>
    compareCaseTreeSiblingTimestamp(input, 'updated'),
  status: compareCaseTreeSiblingStatus,
  signature: compareCaseTreeSiblingSignature,
  locked: (input: CaseTreeSiblingComparisonInput): number =>
    compareCaseTreeSiblingFlag(input, 'isLocked'),
  sent: (input: CaseTreeSiblingComparisonInput): number =>
    compareCaseTreeSiblingFlag(input, 'isSent'),
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
  sortBy: CaseTreeNodeSortBy;
  sortOrder: 'asc' | 'desc';
}): MasterTreeNode[] => {
  const sortedIndexByNodeId = new Map<string, number>();
  const nodesByParentId = new Map<string | null, MasterTreeNode[]>();
  nodes.forEach((node: MasterTreeNode): void => {
    const parentId = node.parentId ?? null;
    const current = nodesByParentId.get(parentId) ?? [];
    current.push(node);
    nodesByParentId.set(parentId, current);
  });

  const direction = sortOrder === 'asc' ? 1 : -1;
  const compareSiblings = CASE_TREE_SIBLING_COMPARATORS[sortBy];
  nodesByParentId.forEach((siblings: MasterTreeNode[]): void => {
    const orderedSiblings = siblings
      .map(
        (node: MasterTreeNode): CaseTreeNodeComparable => ({
          node,
          caseFile: resolveCaseTreeNodeFile(node, filesById),
        })
      )
      .sort((left: CaseTreeNodeComparable, right: CaseTreeNodeComparable): number => {
        const primaryDelta = compareSiblings({
          left,
          right,
          caseIdentifierPathById,
          direction,
          sortOrder,
        });
        if (primaryDelta !== 0) return primaryDelta;
        return compareCaseTreeSiblingFallback(left, right);
      });
    orderedSiblings.forEach(({ node }: CaseTreeNodeComparable, index: number): void => {
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
