import type { FilemakerDatabase, FilemakerLexiconTermCategory } from '../../types';

export type LexiconTermSample = {
  id: string;
  label: string;
  from?: FilemakerLexiconTermCategory;
  to?: FilemakerLexiconTermCategory;
};

export type FilemakerJobBoardLexiconRepairSummary = {
  beforeTermCount: number;
  afterTermCount: number;
  promotedTechnologyTerms: number;
  mergedTechnologyTerms: number;
  promotedRequirementTerms: number;
  mergedRequirementTerms: number;
  promotedValidationPatternTerms: number;
  mergedValidationPatternTerms: number;
  removedNoiseTerms: number;
  removedLexiconLinks: number;
  updatedLexiconLinks: number;
  updatedListings: number;
  promotedSamples: LexiconTermSample[];
  mergedSamples: LexiconTermSample[];
  removedSamples: LexiconTermSample[];
};

export type FilemakerJobBoardLexiconRepairResult = {
  changed: boolean;
  database: FilemakerDatabase;
  summary: FilemakerJobBoardLexiconRepairSummary;
};
