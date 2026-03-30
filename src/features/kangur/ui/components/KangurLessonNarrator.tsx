'use client';

import { useLocale } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import {
  KANGUR_NARRATOR_SETTINGS_KEY,
  parseKangurNarratorSettings,
} from '@/features/kangur/settings';
import {
  KANGUR_TTS_DEFAULT_VOICE,
  type KangurLessonTtsVoice,
} from '@/features/kangur/tts/contracts';
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
import { useKangurElevatedSession } from '@/features/kangur/ui/hooks/useKangurElevatedSession';

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
  descriptionOverride?: string | undefined;
  displayMode?: 'button' | 'icon';
  readLabel?: string | undefined;
  pauseLabel?: string | undefined;
  resumeLabel?: string | undefined;
  loadingLabel?: string | undefined;
  showFeedback?: boolean | undefined;
  titleOverride?: string | undefined;
};

const buildNarratorContextRegistry = (
  pageContextRegistry: ReturnType<typeof useOptionalContextRegistryPageEnvelope>
) =>
  pageContextRegistry
    ? buildContextRegistryConsumerEnvelope({
      refs: pageContextRegistry.refs,
      resolved: pageContextRegistry.resolved ?? null,
      rootNodeIds: [...KANGUR_LESSON_NARRATOR_CONTEXT_ROOT_IDS],
    })
    : null;

const useNarratorContextRegistry = () => {
  const pageContextRegistry = useOptionalContextRegistryPageEnvelope();

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

  return useMemo(
    () => buildNarratorContextRegistry(pageContextRegistry),
    [pageContextRegistry]
  );
};

const resolveNarratorVoice = ({
  lesson,
  lessonDocument,
  defaultVoice,
}: {
  lesson: KangurLessonNarratorProps['lesson'];
  lessonDocument: KangurLessonDocument | null;
  defaultVoice: KangurLessonTtsVoice;
}): KangurLessonTtsVoice =>
  lesson.contentMode === 'document'
    ? (lessonDocument?.narration?.voice ?? defaultVoice)
    : defaultVoice;

const resolveLocalizedLessonCopy = ({
  lesson,
  locale,
  titleOverride,
  descriptionOverride,
}: {
  lesson: KangurLessonNarratorProps['lesson'];
  locale: string;
  titleOverride: string | undefined;
  descriptionOverride: string | undefined;
}): { title: string; description: string } => ({
  title:
    titleOverride?.trim() ||
    (typeof lesson.componentId === 'string'
      ? getLocalizedKangurLessonTitle(lesson.componentId, locale, lesson.title)
      : lesson.title),
  description:
    descriptionOverride?.trim() ||
    (typeof lesson.componentId === 'string'
      ? getLocalizedKangurLessonDescription(lesson.componentId, locale, lesson.description)
      : lesson.description),
});

const shouldObserveNarrationText = (
  lesson: KangurLessonNarratorProps['lesson'],
  lessonDocument: KangurLessonDocument | null
): boolean => lesson.contentMode !== 'document' || !lessonDocument;

const useObservedNarrationText = ({
  shouldObserveText,
  lessonContentRef,
  lessonId,
  lessonContentMode,
  lessonDocument,
}: {
  shouldObserveText: boolean;
  lessonContentRef: KangurLessonNarratorProps['lessonContentRef'];
  lessonId: string;
  lessonContentMode: KangurLesson['contentMode'];
  lessonDocument: KangurLessonDocument | null;
}): string => {
  const [observedText, setObservedText] = useState('');

  useEffect(() => {
    if (!shouldObserveText || !lessonContentRef?.current) {
      setObservedText('');
      return;
    }

    const root = lessonContentRef.current;
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
  }, [lessonContentMode, lessonId, lessonContentRef, lessonDocument, shouldObserveText]);

  return observedText;
};

const buildNarrationScript = ({
  lesson,
  lessonDocument,
  localizedLessonTitle,
  localizedLessonDescription,
  observedText,
}: {
  lesson: KangurLessonNarratorProps['lesson'];
  lessonDocument: KangurLessonDocument | null;
  localizedLessonTitle: string;
  localizedLessonDescription: string;
  observedText: string;
}) => {
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

  return documentScript && hasKangurLessonNarrationContent(documentScript)
    ? documentScript
    : textScript;
};

export function KangurLessonNarrator(props: KangurLessonNarratorProps): React.JSX.Element | null {
  const {
    lesson,
    lessonDocument,
    lessonContentRef,
    className,
    descriptionOverride,
    displayMode = 'button',
    readLabel = 'Read',
    pauseLabel = 'Pause',
    resumeLabel = 'Resume',
    loadingLabel,
    showFeedback,
    titleOverride,
  } = props;
  const locale = useLocale();
  const { isSuperAdmin } = useKangurElevatedSession();
  const settingsStore = useSettingsStore();
  const rawNarratorSettings = settingsStore.get(KANGUR_NARRATOR_SETTINGS_KEY);
  const narratorSettings = useMemo(
    () => parseKangurNarratorSettings(rawNarratorSettings),
    [rawNarratorSettings]
  );
  const defaultVoice = narratorSettings.voice ?? KANGUR_TTS_DEFAULT_VOICE;
  const isNarratorDiagnosticsVisible = isSuperAdmin;
  const voice = resolveNarratorVoice({ lesson, lessonDocument, defaultVoice });
  const requestContextRegistry = useNarratorContextRegistry();
  const shouldObserveText = shouldObserveNarrationText(lesson, lessonDocument);
  const localizedLessonCopy = resolveLocalizedLessonCopy({
    lesson,
    locale,
    titleOverride,
    descriptionOverride,
  });
  const observedText = useObservedNarrationText({
    shouldObserveText,
    lessonContentRef,
    lessonId: lesson.id,
    lessonContentMode: lesson.contentMode,
    lessonDocument,
  });

  const script = useMemo(() => {
    return buildNarrationScript({
      lesson,
      lessonDocument,
      localizedLessonTitle: localizedLessonCopy.title,
      localizedLessonDescription: localizedLessonCopy.description,
      observedText,
    });
  }, [lesson, lessonDocument, localizedLessonCopy.description, localizedLessonCopy.title, observedText]);

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
