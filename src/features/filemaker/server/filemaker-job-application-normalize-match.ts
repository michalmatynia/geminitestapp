import type {
  FilemakerJobApplication,
  FilemakerJobApplicationMatchAnalysis,
  FilemakerJobApplicationMatchAnalysisDecision,
} from '../filemaker-job-application.types';
import {
  normalizeNumber,
  normalizeRecord,
  normalizeString,
  normalizeStringArray,
} from './filemaker-job-application-normalize-base';

export const normalizeMatchAnalysisDecision = (
  value: unknown
): FilemakerJobApplicationMatchAnalysisDecision | null => {
  const normalized = normalizeString(value)?.toLowerCase().replace(/[_-]+/gu, ' ') ?? null;
  if (normalized === null) return null;
  if (isApplyDecision(normalized)) return 'Apply now';
  if (isPrepareDecision(normalized)) return 'Prepare before applying';
  if (isEvidenceRebuildDecision(normalized)) return 'Deprioritise or rebuild evidence';
  return null;
};

const isApplyDecision = (normalized: string): boolean =>
  normalized === 'apply now' || normalized === 'apply';

const isPrepareDecision = (normalized: string): boolean =>
  normalized === 'prepare before applying' ||
  normalized === 'prepare first' ||
  normalized === 'prepare';

const isEvidenceRebuildDecision = (normalized: string): boolean =>
  normalized === 'deprioritise or rebuild evidence' ||
  normalized === 'deprioritize or rebuild evidence' ||
  normalized === 'deprioritise' ||
  normalized === 'deprioritize' ||
  normalized === 'rebuild evidence';

const normalizeMatchAnalysisAttentionAreas = (
  value: unknown
): FilemakerJobApplicationMatchAnalysis['attentionAreas'] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown) => {
      const record = normalizeRecord(entry);
      if (record === null) return null;
      return {
        area: normalizeString(record['area']),
        whyItMatters: normalizeString(record['whyItMatters']),
        recommendedAction: normalizeString(record['recommendedAction']),
        evidence: normalizeString(record['evidence']),
      };
    })
    .filter(
      (
        entry
      ): entry is FilemakerJobApplicationMatchAnalysis['attentionAreas'][number] =>
        entry !== null
    );
};

export const toMatchAnalysis = (value: unknown): FilemakerJobApplicationMatchAnalysis | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  return {
    score: normalizeNumber(record['score']),
    scoreLabel: normalizeString(record['scoreLabel']),
    summary: normalizeString(record['summary']),
    changeSincePrevious: normalizeString(record['changeSincePrevious']),
    recommendedDecision: normalizeMatchAnalysisDecision(record['recommendedDecision']),
    recommendedDecisionReason: normalizeString(record['recommendedDecisionReason']),
    strongMatches: normalizeStringArray(record['strongMatches']),
    gaps: normalizeStringArray(record['gaps']),
    attentionAreas: normalizeMatchAnalysisAttentionAreas(record['attentionAreas']),
    cvEvidence: normalizeStringArray(record['cvEvidence']),
    jobEvidence: normalizeStringArray(record['jobEvidence']),
    riskFlags: normalizeStringArray(record['riskFlags']),
    interviewTalkingPoints: normalizeStringArray(record['interviewTalkingPoints']),
    learningPlan: normalizeStringArray(record['learningPlan']),
  };
};

export const normalizeMatchAnalysisHistory = (
  value: unknown
): NonNullable<FilemakerJobApplication['matchAnalysisHistory']> | null => {
  if (!Array.isArray(value)) return null;
  const history = value
    .map((entry: unknown) => {
      const record = normalizeRecord(entry);
      if (record === null) return null;
      const id = normalizeString(record['id']);
      if (id === null) return null;
      return {
        id,
        payload: toMatchAnalysis(record['payload']),
        sourceRunId: normalizeString(record['sourceRunId']),
        modelId: normalizeString(record['modelId']),
        applicationId: normalizeString(record['applicationId']),
        canonicalApplicationKeySnapshot: normalizeString(record['canonicalApplicationKeySnapshot']),
        applicationUpdatedAtSnapshot: normalizeString(record['applicationUpdatedAtSnapshot']),
        createdAt: normalizeString(record['createdAt']),
      };
    })
    .filter(
      (
        entry
      ): entry is NonNullable<FilemakerJobApplication['matchAnalysisHistory']>[number] =>
        entry !== null
    );
  return history.length > 0 ? history : null;
};
