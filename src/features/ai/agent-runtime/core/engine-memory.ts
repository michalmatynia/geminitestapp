import 'server-only';

import { reminderList } from '@/features/ai/agent-runtime/core/utils';
import { validateAndAddAgentLongTermMemory } from '@/features/ai/agent-runtime/memory';
import type { PlanStep, PlannerMeta, AgentVerification, AgentRunRecord } from '@/shared/contracts/agent-runtime';

export interface ImprovementReview {
  summary: string;
  mistakes: string[];
  improvements: string[];
  guardrails: string[];
  toolAdjustments: string[];
  confidence?: number | null;
}

export interface ExtractionSummary {
  extractionType?: string;
  extractedCount?: number;
  items?: string[];
}

interface MemoryAdditionOptions {
  run: { id: string; prompt: string; personaId: string | null };
  memoryKey: string;
  overallOk: boolean;
  taskType: PlannerMeta['taskType'] | null;
  verification: AgentVerification | null;
  improvementReview: ImprovementReview;
  memoryValidationModel: string | null;
  memorySummarizationModel: string | null;
  resolvedModel: string;
}

function buildSelfImprovementContent(review: ImprovementReview): string {
  const parts: string[] = [
    `Self-improvement review: ${review.summary}`,
  ];

  if (review.mistakes.length > 0) {
    parts.push(reminderList('Mistakes', review.mistakes));
  }
  if (review.improvements.length > 0) {
    parts.push(reminderList('Improvements', review.improvements));
  }
  if (review.guardrails.length > 0) {
    parts.push(reminderList('Guardrails', review.guardrails));
  }
  if (review.toolAdjustments.length > 0) {
    parts.push(reminderList('Tool adjustments', review.toolAdjustments));
  }

  return parts.join('\n');
}

export async function addSelfImprovementMemory(options: MemoryAdditionOptions): Promise<void> {
  const {
    run, memoryKey, overallOk, taskType, verification,
    improvementReview, memoryValidationModel, memorySummarizationModel, resolvedModel,
  } = options;

  const content = buildSelfImprovementContent(improvementReview);

  await validateAndAddAgentLongTermMemory({
    memoryKey,
    runId: run.id,
    personaId: run.personaId,
    content,
    summary: improvementReview.summary,
    tags: ['self-improvement', overallOk ? 'completed' : 'failed'],
    metadata: {
      prompt: run.prompt,
      taskType,
      status: overallOk ? 'completed' : 'failed',
      verification: verification ?? null,
      mistakes: improvementReview.mistakes,
      improvements: improvementReview.improvements,
      guardrails: improvementReview.guardrails,
      toolAdjustments: improvementReview.toolAdjustments,
      confidence: improvementReview.confidence ?? null,
    },
    importance: overallOk ? 3 : 4,
    model: memoryValidationModel ?? resolvedModel,
    summaryModel: memorySummarizationModel ?? resolvedModel,
    prompt: run.prompt,
  });
}

interface RunSummaryMemoryOptions {
  run: AgentRunRecord;
  memoryKey: string;
  overallOk: boolean;
  taskType: PlannerMeta['taskType'] | null;
  finalUrl: string | null;
  verification: AgentVerification | null;
  extractionSummary: ExtractionSummary | null;
  planSteps: PlanStep[];
  memoryValidationModel: string | null;
  memorySummarizationModel: string | null;
  resolvedModel: string;
}

function getTaskPart(taskType: string | null): string | null {
  return (taskType !== null && taskType !== '') ? `Task type: ${taskType}` : null;
}

function getUrlPart(finalUrl: string | null): string | null {
  return (finalUrl !== null && finalUrl !== '') ? `URL: ${finalUrl}` : null;
}

function getVerdictPart(verdict: string | undefined): string | null {
  return (verdict !== undefined && verdict !== '') ? `Verification: ${verdict}` : null;
}

function getExtractionPart(extractionSummary: ExtractionSummary | null): string | null {
  if (extractionSummary?.extractionType !== undefined && extractionSummary.extractionType !== '') {
    const count = extractionSummary.extractedCount ?? 0;
    return `Extraction: ${extractionSummary.extractionType} (${count})`;
  }
  return null;
}

function getSummaryText(options: {
  runPrompt: string;
  overallOk: boolean;
  taskType: string | null;
  finalUrl: string | null;
  verdict: string | undefined;
  extractionSummary: ExtractionSummary | null;
}): string {
  const { runPrompt, overallOk, taskType, finalUrl, verdict, extractionSummary } = options;

  const parts: (string | null)[] = [
    `Task: ${runPrompt}`,
    `Status: ${overallOk ? 'completed' : 'failed'}`,
    getTaskPart(taskType),
    getUrlPart(finalUrl),
    getVerdictPart(verdict),
    getExtractionPart(extractionSummary),
  ];

  return parts.filter((p): p is string => p !== null).join(' · ');
}

function getStepSummaryLines(stepSummary: { title: string; status: string; phase: string | null }[]): string[] {
  return stepSummary.map((s, i) => {
    const phaseInfo = s.phase !== null ? `, ${s.phase}` : '';
    return `${i + 1}. ${s.title} (${s.status}${phaseInfo})`;
  });
}

function getVerificationEvidenceLine(evidence: string[] | undefined): string | null {
  if (evidence !== undefined && evidence.length > 0) {
    return `Evidence: ${evidence.join(' | ')}`;
  }
  return null;
}

function getVerificationMissingLine(missing: string[] | undefined): string | null {
  if (missing !== undefined && missing.length > 0) {
    return `Missing: ${missing.join(' | ')}`;
  }
  return null;
}

function getVerificationFollowUpLine(followUp: string | null | undefined): string | null {
  if (followUp !== undefined && followUp !== null && followUp !== '') {
    return `Follow-up: ${followUp}`;
  }
  return null;
}

function getVerificationLines(verification: AgentVerification | null): string[] {
  const lines: (string | null)[] = [
    getVerificationEvidenceLine(verification?.evidence),
    getVerificationMissingLine(verification?.missing),
    getVerificationFollowUpLine(verification?.followUp),
  ];
  return lines.filter((l): l is string => l !== null);
}

function buildRunSummaryContent(
  summary: string,
  stepSummary: { title: string; status: string; phase: string | null }[],
  verification: AgentVerification | null,
  extractionSummary: ExtractionSummary | null
): string {
  const parts: string[] = [
    summary,
    'Steps:',
    ...getStepSummaryLines(stepSummary),
    ...getVerificationLines(verification),
  ];

  if (extractionSummary?.items && extractionSummary.items.length > 0) {
    parts.push(`Sample items: ${extractionSummary.items.join(' | ')}`);
  }

  return parts.join('\n');
}

export async function addRunSummaryMemory(options: RunSummaryMemoryOptions): Promise<void> {
  const {
    run, memoryKey, overallOk, taskType, finalUrl, verification,
    extractionSummary, planSteps, memoryValidationModel, memorySummarizationModel, resolvedModel,
  } = options;

  const stepSummary = planSteps.map((step) => ({
    title: step.title,
    status: step.status,
    phase: step.phase ?? null,
    priority: step.priority ?? null,
  }));

  const summary = getSummaryText({
    runPrompt: run.prompt,
    overallOk,
    taskType,
    finalUrl,
    verdict: verification?.verdict,
    extractionSummary,
  });

  const content = buildRunSummaryContent(summary, stepSummary, verification, extractionSummary);

  await validateAndAddAgentLongTermMemory({
    memoryKey,
    runId: run.id,
    personaId: run.personaId,
    content,
    summary,
    tags: ['agent-run', overallOk ? 'completed' : 'failed'],
    metadata: {
      run,
      prompt: run.prompt,
      taskType,
      status: overallOk ? 'completed' : 'failed',
      url: finalUrl,
      runId: run.id,
      steps: stepSummary,
      verification: verification ?? null,
      extraction: extractionSummary,
    },
    importance: overallOk ? 3 : 2,
    model: memoryValidationModel ?? resolvedModel,
    summaryModel: memorySummarizationModel ?? resolvedModel,
    prompt: run.prompt,
  });
}
