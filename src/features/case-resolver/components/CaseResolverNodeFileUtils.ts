import type { 
  CaseResolverFile, 
  CaseResolverJoinMode, 
  CaseResolverScanSlot,
} from '@/shared/contracts/case-resolver';
import {
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS,
  CASE_RESOLVER_LEGACY_DOCUMENT_CONTENT_PORT,
} from '@/shared/contracts/case-resolver';

export const PREVIEW_MAX_CHARS = 400;
export const SEARCHABLE_CONTENT_MAX_CHARS = 6000;
export const LEGACY_DOCUMENT_TEXTFIELD_PORT = 'textfield';
export const NODEFILE_JOIN_VALUE_MAP: Record<CaseResolverJoinMode, string> = {
  newline: '\n',
  tab: '\t',
  space: ' ',
  none: '',
};

export type NodeFileDocumentSearchScope = 'case_scope' | 'all_cases';

export type NodeFileDocumentSearchRow = {
  file: CaseResolverFile;
  signatureLabel: string;
  addresserLabel: string;
  addresseeLabel: string;
  folderPath: string;
  folderSegments: string[];
  searchable: string;
};

export type NodeFileDocumentFolderNode = {
  path: string;
  name: string;
  parentPath: string | null;
  depth: number;
  directFileCount: number;
  descendantFileCount: number;
};

export type NodeFileDocumentFolderTree = {
  nodesByPath: Map<string, NodeFileDocumentFolderNode>;
  childPathsByParent: Map<string | null, string[]>;
  rootFileCount: number;
};

export const normalizeSearchText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeFolderPathSegments = (folderPath: string): string[] =>
  folderPath
    .split('/')
    .map((segment: string): string => segment.trim())
    .filter((segment: string): boolean => segment.length > 0);

export const isFolderPathWithinScope = (
  candidateFolderPath: string,
  scopeFolderPath: string
): boolean =>
  candidateFolderPath === scopeFolderPath ||
  candidateFolderPath.startsWith(`${scopeFolderPath}/`);

export const resolvePartyReferenceSearchLabel = (
  reference: CaseResolverFile['addresser'] | CaseResolverFile['addressee']
): string => {
  if (!reference) return '';
  const kind = typeof reference.kind === 'string' ? reference.kind.trim() : '';
  const id = typeof reference.id === 'string' ? reference.id.trim() : '';
  if (!kind && !id) return '';
  return [kind, id].filter(Boolean).join(':');
};

export const resolveIdentifierSearchLabel = (
  identifierId: string | null | undefined,
  labelsById: Map<string, string>
): string => {
  const normalizedIdentifierId = typeof identifierId === 'string' ? identifierId.trim() : '';
  if (!normalizedIdentifierId) return '';
  return labelsById.get(normalizedIdentifierId) ?? normalizedIdentifierId;
};

export const resolveContentPreview = (file: CaseResolverFile): string => {
  if (file.fileType === 'document') {
    const text = file.documentContentPlainText.trim() || file.documentContentMarkdown.trim();
    if (!text) return '';
    return text.length > PREVIEW_MAX_CHARS ? `${text.slice(0, PREVIEW_MAX_CHARS)}…` : text;
  }
  if (file.fileType === 'scanfile') {
    const combined = file.scanSlots
      .map((slot: CaseResolverScanSlot): string => (slot.ocrText ?? '').trim())
      .filter(Boolean)
      .join('\n\n');
    if (!combined) return '';
    return combined.length > PREVIEW_MAX_CHARS
      ? `${combined.slice(0, PREVIEW_MAX_CHARS)}…`
      : combined;
  }
  return '';
};

export const resolveSearchableDocumentContent = (file: CaseResolverFile): string => {
  if (file.fileType === 'document') {
    const text =
      file.documentContentPlainText.trim() ||
      file.documentContentMarkdown.trim() ||
      file.documentContent.trim();
    return text.length > SEARCHABLE_CONTENT_MAX_CHARS
      ? text.slice(0, SEARCHABLE_CONTENT_MAX_CHARS)
      : text;
  }
  if (file.fileType === 'scanfile') {
    const combined = file.scanSlots
      .map((slot: CaseResolverScanSlot): string => (slot.ocrText ?? '').trim())
      .filter(Boolean)
      .join('\n\n');
    return combined.length > SEARCHABLE_CONTENT_MAX_CHARS
      ? combined.slice(0, SEARCHABLE_CONTENT_MAX_CHARS)
      : combined;
  }
  return '';
};

export const collectScopedCaseIds = (
  files: CaseResolverFile[],
  rootCaseId: string | null
): Set<string> | null => {
  if (!rootCaseId) return null;
  const caseById = new Map(
    files
      .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
      .map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  if (!caseById.has(rootCaseId)) return null;

  const childrenByParent = new Map<string, string[]>();
  caseById.forEach((file: CaseResolverFile): void => {
    const parentCaseId = typeof file.parentCaseId === 'string' ? file.parentCaseId.trim() : '';
    if (!parentCaseId || parentCaseId === file.id || !caseById.has(parentCaseId)) return;
    const currentChildren = childrenByParent.get(parentCaseId) ?? [];
    currentChildren.push(file.id);
    childrenByParent.set(parentCaseId, currentChildren);
  });

  const scoped = new Set<string>();
  const visit = (caseId: string): void => {
    if (!caseId || scoped.has(caseId)) return;
    if (!caseById.has(caseId)) return;
    scoped.add(caseId);
    const children = childrenByParent.get(caseId) ?? [];
    children.forEach((childCaseId: string): void => visit(childCaseId));
  };
  visit(rootCaseId);
  return scoped.size > 0 ? scoped : null;
};

export const isDocumentTextfieldPort = (port: string | null | undefined): boolean =>
  port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[0] || port === LEGACY_DOCUMENT_TEXTFIELD_PORT;

export const isDocumentPlaintextContentPort = (port: string | null | undefined): boolean =>
  port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[1] ||
  port === CASE_RESOLVER_LEGACY_DOCUMENT_CONTENT_PORT ||
  !port;

export const isDocumentPlainTextPort = (port: string | null | undefined): boolean =>
  port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[2];

export const isDocumentWysiwygContentPort = (port: string | null | undefined): boolean =>
  port === CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS[3];

export const resolveOutputValueByPort = (
  outputs:
    | {
      textfield: string;
      plaintextContent: string;
      plainText: string;
      wysiwygContent: string;
    }
    | null
    | undefined,
  fromPort: string | null | undefined,
  fallback: 'textfield' | 'plaintextContent' | 'plainText' | 'wysiwygContent'
): string => {
  if (!outputs) return '';
  if (isDocumentTextfieldPort(fromPort)) return outputs.textfield;
  if (isDocumentPlainTextPort(fromPort)) return outputs.plainText;
  if (isDocumentWysiwygContentPort(fromPort)) return outputs.wysiwygContent;
  if (isDocumentPlaintextContentPort(fromPort)) return outputs.plaintextContent;
  if (fallback === 'plainText') return outputs.plainText;
  if (fallback === 'wysiwygContent') return outputs.wysiwygContent;
  return fallback === 'textfield' ? outputs.textfield : outputs.plaintextContent;
};

export const appendWithJoinMode = (
  current: string,
  value: string,
  joinMode: CaseResolverJoinMode
): string => {
  if (!value) return current;
  if (!current) return value;
  return `${current}${NODEFILE_JOIN_VALUE_MAP[joinMode]}${value}`;
};
