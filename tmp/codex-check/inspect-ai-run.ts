import 'dotenv/config';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';

const runId = process.argv[2];
if (!runId) {
  throw new Error('runId argument is required');
}

async function main(): Promise<void> {
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  const nodes = await repo.listRunNodes(runId);
  const model = nodes.find((node) => node.nodeType === 'model') ?? null;
  const prompt = nodes.find((node) => node.nodeType === 'prompt') ?? null;
  console.log(
    JSON.stringify(
      {
        run: run
          ? {
              id: run.id,
              status: run.status,
              errorMessage: run.errorMessage ?? null,
            }
          : null,
        model,
        prompt,
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
