const RELATION_TREE_CASE_PREFIX = 'relation_case::';
const RELATION_TREE_FOLDER_PREFIX = 'relation_folder::';
const RELATION_TREE_FILE_PREFIX = 'relation_file::';

export const RELATION_TREE_UNASSIGNED_CASE_KEY = '__unassigned_case__';

const normalizeToken = (value: string): string => encodeURIComponent(value.trim().toLowerCase());

export const buildRelationCaseNodeId = (caseId: string | null): string => {
  const normalizedCaseId = caseId?.trim() || RELATION_TREE_UNASSIGNED_CASE_KEY;
  return `${RELATION_TREE_CASE_PREFIX}${normalizeToken(normalizedCaseId)}`;
};

export const buildRelationFolderNodeId = (input: {
  caseId: string | null;
  folderPath: string;
}): string => {
  const normalizedCaseId = input.caseId?.trim() || RELATION_TREE_UNASSIGNED_CASE_KEY;
  const normalizedFolderPath = input.folderPath.trim() || '.';
  return `${RELATION_TREE_FOLDER_PREFIX}${normalizeToken(normalizedCaseId)}::${normalizeToken(
    normalizedFolderPath
  )}`;
};

export const buildRelationFileNodeId = (fileId: string): string =>
  `${RELATION_TREE_FILE_PREFIX}${normalizeToken(fileId)}`;

export const buildRelationCasePath = (caseId: string | null): string =>
  caseId?.trim() ? `cases/${caseId.trim()}` : 'cases/unassigned';

export const buildRelationFolderPath = (input: {
  caseId: string | null;
  folderPath: string;
}): string => {
  const casePath = buildRelationCasePath(input.caseId);
  const folderPath = input.folderPath.trim();
  return folderPath ? `${casePath}/${folderPath}` : casePath;
};
