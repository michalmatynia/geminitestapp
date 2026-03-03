import type { NodeFileDocumentSearchRow } from '../../components/CaseResolverNodeFileUtils';

export type RelationMasterTreeBuildInput = {
  rows: NodeFileDocumentSearchRow[];
};

export type RelationCaseBucket = {
  caseId: string | null;
  signatureLabel: string;
  rows: NodeFileDocumentSearchRow[];
};

export type RelationFolderKey = {
  caseId: string | null;
  folderPath: string;
};

