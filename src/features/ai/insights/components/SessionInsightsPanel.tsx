'use client';

import React, { useState, useCallback } from 'react';
import { Button, Input } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

export function SessionInsightsPanel(): React.JSX.Element {
  const [sessionId, setSessionId] = useState('');
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (event: React.MouseEvent): Promise<void> => {
    event.preventDefault();
    if (sessionId.trim() === '') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-insights/generate/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error('Failed to generate insight');
      const data = (await res.json()) as { insight: string };
      setInsight(data.insight);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

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
        <Button size='sm' onClick={(e: React.MouseEvent) => { void handleGenerate(e); }} disabled={loading || sessionId.trim() === ''}>
          {loading ? 'Analyzing...' : 'Analyze'}
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
