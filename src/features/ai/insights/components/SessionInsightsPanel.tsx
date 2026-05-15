'use client';

import React, { useState, useCallback } from 'react';
import { Button, Input } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';

type SessionInsightResponse = {
  insight: string;
};

const generateSessionInsight = async (sessionId: string): Promise<SessionInsightResponse> => {
  const response = await fetch('/api/ai-insights/generate/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!response.ok) throw new Error('Failed to generate insight');
  return (await response.json()) as SessionInsightResponse;
};

export function SessionInsightsPanel(): React.JSX.Element {
  const [sessionId, setSessionId] = useState('');
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generateInsightMutation = createMutationV2<SessionInsightResponse, string>({
    mutationKey: ['ai-insights', 'session', 'generate'],
    mutationFn: async (sessionIdInput) => generateSessionInsight(sessionIdInput),
    meta: {
      source: 'features.ai.insights.SessionInsightsPanel.generate',
      operation: 'action',
      resource: 'ai-insights.session',
      domain: 'ai',
      description: 'Generates qualitative insights from a chatbot session transcript.',
      errorPresentation: 'inline',
    },
  });

  const generate = useCallback(async (event: React.MouseEvent): Promise<void> => {
    event.preventDefault();
    if (sessionId.trim() === '') return;
    setError(null);
    try {
      const data = await generateInsightMutation.mutateAsync(sessionId);
      setInsight(data.insight);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [generateInsightMutation, sessionId]);

  const handleGenerate = async (event: React.MouseEvent): Promise<void> => {
    await generate(event);
  };

  return (
    <FormSection
      title='Session Insights'
      description='Generate qualitative insights from chatbot session transcripts.'
      className='p-4'
    >
      <div className='flex gap-2 mb-4'>
        <Input
          value={sessionId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSessionId(e.target.value)}
          placeholder='Enter Session ID'
          className='h-8'
        />
        <Button
          size='sm'
          onClick={(e: React.MouseEvent) => { void handleGenerate(e); }}
          disabled={generateInsightMutation.isPending || sessionId.trim() === ''}
        >
          {generateInsightMutation.isPending ? 'Analyzing...' : 'Analyze'}
        </Button>
      </div>
      {error !== null && <div className='text-xs text-red-400'>{error}</div>}
      {insight !== null && (
        <div className='p-3 bg-gray-900/50 rounded text-xs text-gray-300 whitespace-pre-wrap'>
          {insight}
        </div>
      )}
    </FormSection>
  );
}
