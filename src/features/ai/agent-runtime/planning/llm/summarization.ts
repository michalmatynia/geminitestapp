/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { runPlannerTask } from './core';

export async function summarizePlannerMemoryWithLLM({
  model,
  memory,
  steps,
  browserContext,
  prompt,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: any[];
  browserContext?: any;
  runId?: string;
}): Promise<string | null> {
  try {
    const systemPrompt =
      'You are an agent memory summarizer. Distill the current session history and browser context into a concise summary of 2-4 sentences that capture the key progress, current roadblocks, and specific discoveries. Focus on what has been definitively learned or achieved.';
    const content = await runPlannerTask({
      model,
      systemPrompt,
      userContent: JSON.stringify({
        prompt,
        memory,
        steps: steps.map((s) => ({ title: s.title, status: s.status })),
        browserContext,
      }),
    });
    const parsed = JSON.parse(content) as { summary?: string };
    return parsed.summary?.trim() || content.trim() || null;
  } catch (_error) {
    return null;
  }
}

export async function buildCheckpointBriefWithLLM({
  prompt,
  model,
  memory,
  steps,
  activeStepId,
  lastError,
  browserContext,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: any[];
  activeStepId: string;
  lastError?: string | null;
  browserContext?: any;
  runId?: string;
}): Promise<{ summary: string; nextActions: string[]; risks: string[] } | null> {
  try {
    const systemPrompt =
      'You are an agent supervisor. Output only JSON with keys: summary, nextActions, risks. summary is a 1-sentence current status. nextActions is an array of 2-3 immediate next steps. risks is an array of 1-2 potential risks or challenges.';
    const content = await runPlannerTask({
      model,
      systemPrompt,
      userContent: JSON.stringify({
        prompt,
        memory,
        steps: steps.map((s) => ({ id: s.id, title: s.title, status: s.status })),
        activeStepId,
        lastError,
        browserContext,
      }),
    });
    const parsed = JSON.parse(content) as {
      summary?: string;
      nextActions?: string[];
      risks?: string[];
    };
    if (!parsed.summary) return null;
    return {
      summary: (parsed.summary).trim(),
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    };
  } catch (_error) {
    return null;
  }
}
