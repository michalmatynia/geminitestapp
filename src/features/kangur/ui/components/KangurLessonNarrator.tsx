'use client';

import { useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import React, { useEffect, useMemo, useState } from 'react';

import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
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
  lesson: Pick<KangurLesson, 'id' | 'title' | 'description' | 'contentMode'> & {
    componentId?: KangurLesson['componentId'];
  };
  lessonDocument: KangurLessonDocument | null;
  lessonContentRef?: React.RefObject<HTMLElement | null> | null;
  className?: string | undefined;
  displayMode?: 'button' | 'icon';
  readLabel?: string | undefined;
  pauseLabel?: string | undefined;
  resumeLabel?: string | undefined;
  loadingLabel?: string | undefined;
  showFeedback?: boolean | undefined;
};

export function KangurLessonNarrator(props: KangurLessonNarratorProps): React.JSX.Element | null {
  const {
    lesson,
    lessonDocument,
    lessonContentRef,
    className,
    displayMode = 'button',
    readLabel = 'Read',
    pauseLabel = 'Pause',
    resumeLabel = 'Resume',
    loadingLabel,
    showFeedback,
  } = props;
  const locale = useLocale();
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

  const shouldObserveText = lesson.contentMode !== 'document' || !lessonDocument;
  const localizedLessonTitle =
    typeof lesson.componentId === 'string'
      ? getLocalizedKangurLessonTitle(lesson.componentId, locale, lesson.title)
      : lesson.title;
  const localizedLessonDescription =
    typeof lesson.componentId === 'string'
      ? getLocalizedKangurLessonDescription(lesson.componentId, locale, lesson.description)
      : lesson.description;

  useEffect(() => {
    if (!shouldObserveText) {
      setObservedText('');
      return;
    }

    if (!lessonContentRef) {
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
  }, [lesson.contentMode, lesson.id, lessonContentRef, lessonDocument, shouldObserveText]);

  const script = useMemo(() => {
    const documentScript =
      lesson.contentMode === 'document' && lessonDocument
        ? buildKangurLessonDocumentNarrationScript({
        lessonId: lesson.id,
        title: localizedLessonTitle,
        description: localizedLessonDescription,
        document: lessonDocument,
      })
        : null;
    const textScript = buildKangurLessonNarrationScriptFromText({
      lessonId: lesson.id,
      title: localizedLessonTitle,
      description: localizedLessonDescription,
      text: observedText,
    });
    if (documentScript && hasKangurLessonNarrationContent(documentScript)) {
      return documentScript;
    }
    return textScript;
  }, [
    lesson.contentMode,
    lesson.id,
    lessonDocument,
    localizedLessonDescription,
    localizedLessonTitle,
    observedText,
  ]);

  if (!hasKangurLessonNarrationContent(script)) {
    return null;
  }

  return (
    <KangurNarratorControl
      className={cn(displayMode === 'icon' ? 'w-auto' : 'w-full', className)}
      contextRegistry={requestContextRegistry}
      diagnosticsVisible={isNarratorDiagnosticsVisible}
      displayMode={displayMode}
      docId='lessons_narrator'
      engine={narratorSettings.engine}
      loadingLabel={loadingLabel}
      pauseLabel={pauseLabel}
      readLabel={readLabel}
      resumeLabel={resumeLabel}
      script={script}
      shellTestId='lesson-narrator-shell'
      showFeedback={showFeedback}
      voice={voice}
    />
  );
}
