import type { 
  CaseResolverFile, 
  CaseResolverAssetFile, 
  CaseResolverGraph,
  CaseResolverNodeMeta,
  CaseResolverEdgeMeta,
  CaseResolverFileType,
  CaseResolverPartyReference,
  CaseResolverCategory,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverScanSlot,
  CaseResolverDocumentDateProposal,
} from '@/shared/contracts/case-resolver';

export type { 
  CaseResolverFile, 
  CaseResolverAssetFile, 
  CaseResolverGraph,
  CaseResolverNodeMeta,
  CaseResolverEdgeMeta,
  CaseResolverFileType,
  CaseResolverPartyReference,
  CaseResolverCategory,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverScanSlot,
  CaseResolverDocumentDateProposal,
};

export type CaseResolverDocumentVersion = 'original' | 'exploded';

export interface CaseResolverCompiledSegment {
  id: string;
  nodeId: string | null;
  role: string;
  content: string;
  title?: string;
  text?: string;
  includeInOutput?: boolean;
  sourceFileId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CaseResolverCompileResult {
  segments: CaseResolverCompiledSegment[];
  combinedContent: string;
  prompt: string;
  outputsByNode: Record<string, { textfield: string; content: string; plainText: string }>;
  warnings: string[];
}

export type CaseResolverEditorMode = 'wysiwyg' | 'markdown' | 'code';

export interface CaseResolverFileEditDraft {
  id: string;
  name: string;
  content: string;
  fileType: CaseResolverFileType;
  folder: string;
  parentCaseId?: string | null;
  referenceCaseIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  documentDate?: CaseResolverDocumentDateProposal | null;
  originalDocumentContent?: string;
  explodedDocumentContent?: string;
  activeDocumentVersion?: CaseResolverDocumentVersion;
  editorType?: CaseResolverEditorMode;
  documentContentFormatVersion?: number;
  documentContentVersion?: string;
  baseDocumentContentVersion?: string | null;
  documentContent?: string;
  documentContentMarkdown?: string;
  documentContentHtml?: string;
  documentContentPlainText?: string;
  documentHistory?: any[];
  documentConversionWarnings?: string[];
  lastContentConversionAt?: string | null;
  scanSlots?: any[];
  scanOcrModel?: string;
  scanOcrPrompt?: string;
  isLocked?: boolean;
  graph?: CaseResolverGraph;
  addresser?: CaseResolverPartyReference | null;
  addressee?: CaseResolverPartyReference | null;
  tagId?: string | null;
  categoryId?: string | null;
  caseIdentifierId?: string | null;
}
