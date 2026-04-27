import { z } from 'zod';
import { createImageStudioRun } from '@/features/ai/image-studio/server';
import { enqueueImageStudioRunJob } from '@/features/ai/image-studio/workers/imageStudioRunQueue';

export const batchImageGeneratorSchema = z.object({
  projectId: z.string(),
  prompts: z.array(z.string()),
  outputCount: z.number().default(1),
  contextRegistry: z.record(z.string(), z.any()).optional(),
});

export type BatchImageGeneratorInput = z.infer<typeof batchImageGeneratorSchema>;

export const runBatchGeneration = async (input: BatchImageGeneratorInput): Promise<string[]> => {
  const runIds = await Promise.all(
    input.prompts.map(async (prompt) => {
      const run = await createImageStudioRun({
        projectId: input.projectId,
        request: {
          projectId: input.projectId,
          prompt,
          ...(input.contextRegistry ? { contextRegistry: input.contextRegistry } : {}),
        },
        expectedOutputs: input.outputCount,
      });
      await enqueueImageStudioRunJob(run.id);
      return run.id;
    })
  );
  return runIds;
};
