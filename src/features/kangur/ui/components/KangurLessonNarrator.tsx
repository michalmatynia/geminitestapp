'use client';

import { useSession } from 'next-auth/react';
import React, { useEffect, useMemo, useState } from 'react';

import {
  KANGUR_NARRATOR_SETTINGS_KEY,
  parseKangurNarratorSettings,
} from '@/features/kangur/settings';
import { KANGUR_TTS_DEFAULT_VOICE } from '@/features/kangur/tts/contracts';
import {
  buildKangurLessonDocumentNarrationScript,
  buildKangurLessonNarrationScriptFromText,
  hasKangurLessonNarrationContent,
} from '@/features/kangur/tts/script';
import type { KangurLesson, KangurLessonDocument } from '@/features/kangur/shared/contracts/kangur';
import {
  useOptionalContextRegistryPageEnvelope,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import { buildContextRegistryConsumerEnvelope } from '@/shared/lib/ai-context-registry/page-context-shared';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { cn } from '@/features/kangur/shared/utils';

import { extractNarrationTextFromElement } from './kangur-narrator-utils';
import { KangurNarratorControl } from './KangurNarratorControl';

const KANGUR_LESSON_NARRATOR_CONTEXT_ROOT_IDS = [
  'component:kangur-lesson-narrator',
  'action:kangur-lesson-tts',
] as const;

type KangurLessonNarratorProps = {
  lesson: Pick<KangurLesson, 'id' | 'title' | 'description' | 'contentMode'>;
  lessonDocument: KangurLessonDocument | null;
  lessonContentRef: React.RefObject<HTMLElement | null>;
  className?: string | undefined;
  readLabel?: string | undefined;
  pauseLabel?: string | undefined;
  resumeLabel?: string | undefined;
  loadingLabel?: string | undefined;
};

export function KangurLessonNarrator(props: KangurLessonNarratorProps): React.JSX.Element | null {
  const {
    lesson,
    lessonDocument,
    lessonContentRef,
    className,
    readLabel = 'Read',
    pauseLabel = 'Pause',
    resumeLabel = 'Resume',
  } = props;
  const { data: session } = useSession();
  const settingsStore = useSettingsStore();
  const rawNarratorSettings = settingsStore.get(KANGUR_NARRATOR_SETTINGS_KEY);
  const narratorSettings = useMemo(
    () => parseKangurNarratorSettings(rawNarratorSettings),
    [rawNarratorSettings]
  );
  const defaultVoice = narratorSettings.voice ?? KANGUR_TTS_DEFAULT_VOICE;
  const isNarratorDiagnosticsVisible = session?.user?.role === 'super_admin';
  const voice =
    lesson.contentMode === 'document'
      ? (lessonDocument?.narration?.voice ?? defaultVoice)
      : defaultVoice;
  const pageContextRegistry = useOptionalContextRegistryPageEnvelope();
  const requestContextRegistry = useMemo(
    () =>
      pageContextRegistry
        ? buildContextRegistryConsumerEnvelope({
          refs: pageContextRegistry.refs,
          resolved: pageContextRegistry.resolved ?? null,
          rootNodeIds: [...KANGUR_LESSON_NARRATOR_CONTEXT_ROOT_IDS],
        })
        : null,
    [pageContextRegistry]
  );
  const [observedText, setObservedText] = useState('');

  useRegisterContextRegistryPageSource(
    'kangur-lesson-narrator',
    useMemo(
      () => ({
        label: 'Kangur lesson narrator',
        rootNodeIds: [...KANGUR_LESSON_NARRATOR_CONTEXT_ROOT_IDS],
      }),
      []
    )
  );

  useEffect(() => {
    if (lesson.contentMode === 'document') {
      setObservedText('');
      return;
    }

    const root = lessonContentRef.current;
    if (!root) {
      setObservedText('');
      return;
    }

    let timeoutId: number | null = null;
    const updateText = (): void => {
      setObservedText(extractNarrationTextFromElement(root));
    };

    updateText();

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    const observer = new MutationObserver(() => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(updateText, 120);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [lesson.contentMode, lesson.id, lessonContentRef]);

  const script = useMemo(() => {
    if (lesson.contentMode === 'document' && lessonDocument) {
      return buildKangurLessonDocumentNarrationScript({
        lessonId: lesson.id,
        title: lesson.title,
        description: lesson.description,
        document: lessonDocument,
      });
    }

    return buildKangurLessonNarrationScriptFromText({
      lessonId: lesson.id,
      title: lesson.title,
      description: lesson.description,
      text: observedText,
    });
  }, [
    lesson.contentMode,
    lesson.description,
    lesson.id,
    lesson.title,
    lessonDocument,
    observedText,
  ]);

  if (!hasKangurLessonNarrationContent(script)) {
    return null;
  }

  return (
    <KangurNarratorControl
      className={cn('w-full', className)}
      contextRegistry={requestContextRegistry}
      diagnosticsVisible={isNarratorDiagnosticsVisible}
      docId='lessons_narrator'
      engine={narratorSettings.engine}
      pauseLabel={pauseLabel}
      readLabel={readLabel}
      resumeLabel={resumeLabel}
      script={script}
      shellTestId='lesson-narrator-shell'
      voice={voice}
    />
  );
}
