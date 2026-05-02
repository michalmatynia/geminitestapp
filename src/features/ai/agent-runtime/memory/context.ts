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
    problem,
    countermeasure,
    tags = [],
  } = options;

  if (memoryKey === '' || problem === '' || countermeasure === '') return;
  const summary = `Problem: ${problem} \u00b7 Countermeasure: ${countermeasure}`;
  
  const payload = buildMemoryPayload(options, summary, tags);
  
  await validateAndAddAgentLongTermMemory(payload);
}

function buildMemoryPayload(
  options: AddProblemSolutionMemoryOptions,
  summary: string,
  tags: string[],
): Parameters<typeof validateAndAddAgentLongTermMemory>[0] {
  const {
    memoryKey,
    runId,
    personaId,
    problem,
    countermeasure,
    context,
    model,
    prompt,
    summaryModel,
  } = options;

  return {
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
    model: model ?? undefined,
    summaryModel: summaryModel ?? undefined,
    prompt: prompt ?? undefined,
  };
}
