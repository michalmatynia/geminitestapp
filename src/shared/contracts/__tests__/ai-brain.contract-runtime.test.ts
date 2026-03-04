import { describe, expect, it } from 'vitest';

import {
  aiBrainAssignmentSchema,
  aiBrainCapabilityKeySchema,
  aiBrainFeatureSchema,
  brainOperationsOverviewResponseSchema,
  brainModelsResponseSchema,
} from '@/shared/contracts/ai-brain';

describe('ai-brain contract runtime', () => {
  it('accepts chatbot as a valid brain feature', () => {
    expect(aiBrainFeatureSchema.parse('chatbot')).toBe('chatbot');
  });

  it('accepts agent runtime capability keys', () => {
    expect(aiBrainCapabilityKeySchema.parse('agent_runtime.planner')).toBe('agent_runtime.planner');
  });

  it('keeps systemPrompt on assignment parsing', () => {
    const assignment = aiBrainAssignmentSchema.parse({
      enabled: true,
      provider: 'model',
      modelId: 'gpt-4o-mini',
      systemPrompt: 'Be concise.',
    });

    expect(assignment.systemPrompt).toBe('Be concise.');
  });

  it('parses the canonical brain models response shape', () => {
    const payload = brainModelsResponseSchema.parse({
      models: ['gpt-4o-mini'],
      descriptors: {
        'gpt-4o-mini': {
          id: 'gpt-4o-mini',
          family: 'chat',
          modality: 'text',
          vendor: 'openai',
          supportsStreaming: true,
          supportsJsonMode: true,
        },
      },
      warning: {
        code: 'OLLAMA_UNAVAILABLE',
        message: 'fallback',
      },
      sources: {
        modelPresets: ['gpt-4o-mini'],
        paidModels: [],
        configuredOllamaModels: ['llama3.2'],
        liveOllamaModels: [],
      },
    });

    expect(payload.models).toEqual(['gpt-4o-mini']);
    expect(payload.descriptors?.['gpt-4o-mini']?.family).toBe('chat');
    expect(payload.sources?.configuredOllamaModels).toEqual(['llama3.2']);
  });

  it('parses the Brain operations overview response shape', () => {
    const payload = brainOperationsOverviewResponseSchema.parse({
      range: '1h',
      generatedAt: '2026-03-01T00:00:00.000Z',
      window: {
        currentStart: '2026-02-29T23:00:00.000Z',
        currentEnd: '2026-03-01T00:00:00.000Z',
        previousStart: '2026-02-29T22:00:00.000Z',
        previousEnd: '2026-02-29T23:00:00.000Z',
      },
      domains: {
        ai_paths: {
          key: 'ai_paths',
          label: 'AI Paths',
          state: 'healthy',
          sampleSize: 12,
          updatedAt: '2026-03-01T00:00:00.000Z',
          metrics: [{ key: 'queued', label: 'Queued', value: 2 }],
          trend: {
            direction: 'unknown',
            delta: 0,
            label: 'Trend unavailable.',
          },
          recentEvents: [],
          links: [{ label: 'Queue', href: '/admin/ai-paths/queue' }],
        },
        chatbot: {
          key: 'chatbot',
          label: 'Chatbot',
          state: 'warning',
          message: '1 failed job(s) in recent sample.',
          sampleSize: 20,
          updatedAt: '2026-03-01T00:00:00.000Z',
          metrics: [{ key: 'failed', label: 'Failed', value: 1 }],
          trend: {
            direction: 'up',
            delta: 1,
            label: 'Failed vs previous 1h',
            current: 1,
            previous: 0,
          },
          recentEvents: [{ id: 'job-1', status: 'failed', timestamp: '2026-03-01T00:00:00.000Z' }],
          links: [{ label: 'Chat', href: '/admin/chatbot' }],
        },
        agent_runtime: {
          key: 'agent_runtime',
          label: 'Agent Runtime',
          state: 'unknown',
          message: 'Run store unavailable.',
          sampleSize: 0,
          updatedAt: '2026-03-01T00:00:00.000Z',
          metrics: [],
          trend: {
            direction: 'unknown',
            delta: 0,
            label: 'Trend unavailable.',
          },
          recentEvents: [],
          links: [{ label: 'Runs', href: '/admin/agentcreator/runs' }],
        },
        image_studio: {
          key: 'image_studio',
          label: 'Image Studio',
          state: 'healthy',
          sampleSize: 7,
          updatedAt: '2026-03-01T00:00:00.000Z',
          metrics: [{ key: 'completed', label: 'Completed', value: 7 }],
          trend: {
            direction: 'flat',
            delta: 0,
            label: 'Failed vs previous 1h',
            current: 0,
            previous: 0,
          },
          recentEvents: [],
          links: [{ label: 'Studio', href: '/admin/image-studio' }],
        },
      },
    });

    expect(payload.range).toBe('1h');
    expect(payload.domains.ai_paths.state).toBe('healthy');
    expect(payload.domains.chatbot.state).toBe('warning');
    expect(payload.domains.agent_runtime.state).toBe('unknown');
    expect(payload.domains.image_studio.metrics[0]?.key).toBe('completed');
  });
});
