import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';

export const runPlannerTask = async (input: {
  model: string;
  systemPrompt: string;
  userContent: string;
  temperature?: number;
}): Promise<string> => {
  const response = await runBrainChatCompletion({
    modelId: input.model,
    temperature: input.temperature ?? 0.2,
    jsonMode: true,
    messages: [
      {
        role: 'system',
        content: input.systemPrompt,
      },
      {
        role: 'user',
        content: input.userContent,
      },
    ],
  });
  return response.text.trim();
};
