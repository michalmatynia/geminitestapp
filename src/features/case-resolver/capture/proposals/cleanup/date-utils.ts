import { extractCaseResolverDocumentDate } from '../utils';

export const hasValidDocumentDate = (line: string): boolean => {
  const date = extractCaseResolverDocumentDate(line);
  return date !== null && date !== undefined;
};
