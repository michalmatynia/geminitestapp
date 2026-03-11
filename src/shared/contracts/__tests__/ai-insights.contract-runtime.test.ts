import { describe, expect, it } from 'vitest';

import {
  aiInsightResponseSchema,
  aiInsightsResponseSchema,
} from '@/shared/contracts/ai-insights';

const sampleInsight = {
  id: 'insight-1',
  name: 'Analytics anomaly',
  type: 'analytics' as const,
  status: 'new' as const,
  source: 'manual' as const,
  score: 0.92,
  content: {
    summary: 'Conversion rate dropped after the latest deploy.',
  },
  createdAt: '2026-03-11T10:00:00.000Z',
  updatedAt: '2026-03-11T10:05:00.000Z',
};

describe('ai insights contract runtime', () => {
  it('parses insight list responses', () => {
    expect(
      aiInsightsResponseSchema.parse({
        insights: [sampleInsight],
      }).insights
    ).toHaveLength(1);
  });

  it('parses nullable single insight responses', () => {
    expect(aiInsightResponseSchema.parse({ insight: null }).insight).toBeNull();
    expect(
      aiInsightResponseSchema.parse({
        insight: sampleInsight,
      }).insight?.id
    ).toBe('insight-1');
  });
});
