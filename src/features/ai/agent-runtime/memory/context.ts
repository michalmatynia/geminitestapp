import { validateAndAddAgentLongTermMemory } from '@/features/ai/agent-runtime/memory';

type AddProblemSolutionMemoryOptions = {
  memoryKey: string;
  runId: string;
  personaId?: string | null;
  problem: string;
  countermeasure: string;
  context?: Record<string, unknown>;
  tags?: string[];
  model?: string | null;
  prompt?: string | null;
  summaryModel?: string | null;
};

export async function addProblemSolutionMemory(
  options: AddProblemSolutionMemoryOptions,
): Promise<void> {
  const {
    memoryKey,
    runId,
    personaId,
    problem,
    countermeasure,
    context,
    tags = [],
    model,
    prompt,
    summaryModel,
  } = options;

  if (!memoryKey || !problem || !countermeasure) return;
  const summary = `Problem: ${problem} \u00b7 Countermeasure: ${countermeasure}`;
  await validateAndAddAgentLongTermMemory({
    memoryKey,
    runId,
    personaId: personaId ?? null,
    content: summary,
    summary,
    tags: ['problem-solution', ...tags],
    metadata: {
      problem,
      countermeasure,
      ...context,
    },
    importance: 4,
    ...(model !== undefined && { model }),
    ...(summaryModel !== undefined && { summaryModel }),
    ...(prompt !== undefined && { prompt }),
  });
}
