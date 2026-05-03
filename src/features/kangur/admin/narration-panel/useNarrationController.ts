import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLessonContentEditorContext } from '../context/LessonContentEditorContext';
import { useOptionalContextRegistryPageEnvelope } from '@/shared/lib/ai-context-registry/page-context';
import { buildContextRegistryConsumerEnvelope } from '@/shared/lib/ai-context-registry/page-context-shared';
import { buildKangurLessonTtsEnvelopeSignature } from '@/features/kangur/tts/context-registry/instructions';
import { buildKangurLessonDocumentNarrationScript } from '@/features/kangur/tts/script';
import { api } from '@/shared/lib/api-client';
import { withKangurClientError } from '@/features/kangur/observability/client';
import type { RequestStatus } from '@/shared/contracts/ui/base';
import type { KangurLessonTtsResponse, KangurLessonTtsStatusResponse } from '@/features/kangur/tts/contracts';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

export function useNarrationController() {
  const { lesson, document, onChange } = useLessonContentEditorContext();
  const pageContextRegistry = useOptionalContextRegistryPageEnvelope();
  
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<KangurLessonTtsResponse | null>(null);
  const [cacheStatus, setCacheStatus] = useState<KangurLessonTtsStatusResponse | null>(null);
  const [isCheckingCache, setIsCheckingCache] = useState(false);

  const requestContextRegistry = useMemo(() => pageContextRegistry ? buildContextRegistryConsumerEnvelope({
      refs: pageContextRegistry.refs,
      resolved: pageContextRegistry.resolved ?? null,
      rootNodeIds: ['component:kangur-lesson-narration-panel', 'action:kangur-lesson-tts'],
    }) : null, [pageContextRegistry]);

  const script = useMemo(() => lesson ? buildKangurLessonDocumentNarrationScript({
      lessonId: lesson.id,
      title: lesson.title,
      description: lesson.description ?? '',
      document,
    }) : { locale: 'pl-PL', segments: [] }, [document, lesson]);

  const handlePreparePreview = useCallback(async (forceRegenerate: boolean) => {
    if (!lesson) return;
    setStatus('loading');
    setErrorMessage(null);
    const nextResponse = await withKangurClientError({
        source: 'kangur.admin.lesson-narration',
        action: 'prepare-preview',
        description: 'Generates a narration preview.',
        context: { lessonId: lesson.id, forceRegenerate },
      },
      async () => await api.post<KangurLessonTtsResponse>('/api/kangur/tts', {
          script,
          voice: document.narration?.voice ?? 'standard',
          forceRegenerate,
          ...(requestContextRegistry ? { contextRegistry: requestContextRegistry } : {}),
        }),
      { fallback: null, onError: (e) => { setStatus('error'); setErrorMessage(e instanceof Error ? e.message : 'Error'); } }
    );
    if (nextResponse) { setResponse(nextResponse); setStatus('ready'); }
  }, [lesson, script, document.narration?.voice, requestContextRegistry]);

  return { status, errorMessage, response, cacheStatus, isCheckingCache, script, handlePreparePreview };
}
