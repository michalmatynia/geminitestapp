import { validateAndAddAgentLongTermMemory } from "@/lib/agent/memory";

export async function addProblemSolutionMemory({
  memoryKey,
  runId,
  problem,
  countermeasure,
  context,
  tags = [],
  model,
  prompt,
  summaryModel,
}: {
  memoryKey: string;
  runId: string;
  problem: string;
  countermeasure: string;
  context?: Record<string, unknown>;
  tags?: string[];
  model?: string | null;
  prompt?: string | null;
  summaryModel?: string | null;
}) {
  if (!memoryKey || !problem || !countermeasure) return;
  const summary = `Problem: ${problem} \u00b7 Countermeasure: ${countermeasure}`;
  await validateAndAddAgentLongTermMemory({
    memoryKey,
    runId,
    content: summary,
    summary,
    tags: ["problem-solution", ...tags],
    metadata: {
      problem,
      countermeasure,
      ...context,
    },
    importance: 4,
    model,
    summaryModel,
    prompt,
  });
}
