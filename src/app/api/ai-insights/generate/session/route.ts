import { apiHandler } from '@/shared/lib/api/api-handler';
import { generateSessionInsight } from '@/features/ai/insights/generator/session-runtime';
import { z } from 'zod';
import { badRequestError } from '@/shared/errors/app-error';

const requestSchema = z.object({
  sessionId: z.string(),
  model: z.string().default('gpt-4o'),
});

export const POST = apiHandler(async (req: Request) => {
  const body = (await req.json()) as unknown;
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) throw badRequestError('Invalid request parameters');
  
  const insight = await generateSessionInsight(parsed.data.sessionId, parsed.data.model);
  return { insight };
}, {
  source: 'ai-insights.generate.session.POST',
  requireAuth: true,
});
