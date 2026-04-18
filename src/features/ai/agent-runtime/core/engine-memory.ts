import 'server-only';

import { reminderList } from '@/features/ai/agent-runtime/core/utils';
import { validateAndAddAgentLongTermMemory } from '@/features/ai/agent-runtime/memory';
import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import type { PlanStep, PlannerMeta, AgentVerification, AgentRuntimeRunRecord } from '@/shared/contracts/agent-runtime';

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

export async function addSelfImprovementMemory(options: MemoryAdditionOptions): Promise<void> {
  const {
    run, memoryKey, overallOk, taskType, verification,
    improvementReview, memoryValidationModel, memorySummarizationModel, resolvedModel,
  } = options;

  const contentParts = [
    `Self-improvement review: ${improvementReview.summary}`,
    improvementReview.mistakes.length > 0 ? reminderList('Mistakes', improvementReview.mistakes) : null,
    improvementReview.improvements.length > 0 ? reminderList('Improvements', improvementReview.improvements) : null,
    improvementReview.guardrails.length > 0 ? reminderList('Guardrails', improvementReview.guardrails) : null,
    improvementReview.toolAdjustments.length > 0 ? reminderList('Tool adjustments', improvementReview.toolAdjustments) : null,
  ];

  const content = contentParts.filter((line): line is string => line !== null).join('\n');

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
  run: AgentRuntimeRunRecord;
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

function getSummaryText(options: {
  runPrompt: string;
  overallOk: boolean;
  taskType: string | null;
  finalUrl: string | null;
  verdict: string | undefined;
  extractionSummary: ExtractionSummary | null;
}): string {
  const { runPrompt, overallOk, taskType, finalUrl, verdict, extractionSummary } = options;
  const parts = [
    `Task: ${runPrompt}`,
    `Status: ${overallOk ? 'completed' : 'failed'}`,
    (taskType !== null && taskType !== '') ? `Task type: ${taskType}` : null,
    (finalUrl !== null && finalUrl !== '') ? `URL: ${finalUrl}` : null,
    (verdict !== undefined && verdict !== '') ? `Verification: ${verdict}` : null,
    extractionSummary?.extractionType ? `Extraction: ${extractionSummary.extractionType} (${extractionSummary.extractedCount ?? 0})` : null,
  ];
  return parts.filter((l): l is string => l !== null).join(' · ');
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

  const contentParts = [
    summary,
    'Steps:',
    ...stepSummary.map((s, i) => `${i + 1}. ${s.title} (${s.status}${s.phase !== null ? `, ${s.phase}` : ''})`),
    (verification?.evidence && verification.evidence.length > 0) ? `Evidence: ${verification.evidence.join(' | ')}` : null,
    (verification?.missing && verification.missing.length > 0) ? `Missing: ${verification.missing.join(' | ')}` : null,
    (verification?.followUp !== undefined && verification.followUp !== null && verification.followUp !== '') ? `Follow-up: ${verification.followUp}` : null,
    (extractionSummary?.items && extractionSummary.items.length > 0) ? `Sample items: ${extractionSummary.items.join(' | ')}` : null,
  ];

  const content = contentParts.filter((line): line is string => line !== null).join('\n');

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
