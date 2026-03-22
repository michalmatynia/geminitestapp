'use client';

import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useOptionalKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_WRAP_CENTER_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { cn, sanitizeSvg } from '@/features/kangur/shared/utils';

import type { KangurAiTutorRuntimeMessage as TutorRenderedMessage } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import {
  getAssistantMessageFeedbackKey,
  toFollowUpHref,
  toWebsiteHelpTargetHref,
} from './KangurAiTutorWidget.helpers';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import { type JSX, useMemo } from 'react';

const AI_TUTOR_FOLLOW_UP_ROUTE_ACKNOWLEDGE_MS = 110;

type TutorDrawingContent = {
  messageLabel?: string;
  previewAlt?: string;
};

const COACHING_MODE_ICON: Record<
  'hint_ladder' | 'misconception_check' | 'review_reflection' | 'next_best_action',
  string
> = {
  hint_ladder: '?',
  misconception_check: 'i',
  review_reflection: '!',
  next_best_action: '*',
};

const getMessageArtifacts = (
  message: TutorRenderedMessage,
  fallbackAlt: string
): NonNullable<TutorRenderedMessage['artifacts']> => {
  const artifacts = Array.isArray(message.artifacts) ? [...message.artifacts] : [];
  const hasUserDrawingArtifact = artifacts.some((artifact) => artifact.type === 'user_drawing');

  if (!hasUserDrawingArtifact && typeof message.drawingImageData === 'string') {
    const normalizedDrawing = message.drawingImageData.trim();
    if (normalizedDrawing) {
      artifacts.unshift({
        type: 'user_drawing',
        imageDataUrl: normalizedDrawing,
        alt: fallbackAlt,
      });
    }
  }

  return artifacts;
};

type KangurAiTutorMessageListProps = {
  introMessage?: string | null;
};

export function KangurAiTutorMessageList({
  introMessage,
}: KangurAiTutorMessageListProps): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const isCoarsePointer = useKangurCoarsePointer();
  const tutor = useOptionalKangurAiTutor();
  const drawingContent = (tutorContent as { drawing?: TutorDrawingContent }).drawing;
  const {
    askModalHelperText,
    basePath,
    canSendMessages,
    emptyStateMessage,
    handleFollowUpClick,
    handleQuickAction,
    handleMessageFeedback,
    handleWebsiteHelpTargetClick,
    isAskModalMode,
    isLoading,
    lastInteractionIntent,
    lastPromptMode,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    messages,
    panelEmptyStateMessage,
    showSources,
    tutorSessionKey,
    visibleQuickActions,
  } = useKangurAiTutorPanelBodyContext();
  const {
    messageFeedbackByKey,
    messagesEndRef,
  } = useKangurAiTutorWidgetStateContext();
  const shouldSuppressConversationHistory =
    isSelectionExplainPendingMode || isSectionExplainPendingMode;
  const visibleMessages = shouldSuppressConversationHistory ? [] : messages;
  const hintQuickAction = useMemo(() => {
    const action = visibleQuickActions.find((candidate) => candidate.id === 'hint');
    if (action) {
      return action;
    }
    return {
      id: 'hint',
      label: tutorContent.quickActions.hint.defaultLabel,
      prompt: tutorContent.quickActions.hint.defaultPrompt,
      promptMode: 'hint' as const,
      interactionIntent: 'hint' as const,
    };
  }, [tutorContent.quickActions.hint.defaultLabel, tutorContent.quickActions.hint.defaultPrompt, visibleQuickActions]);
  const lastAssistantMessageIndex = useMemo(() => {
    let lastIndex = -1;
    visibleMessages.forEach((message, index) => {
      if (message.role === 'assistant') {
        lastIndex = index;
      }
    });
    return lastIndex;
  }, [visibleMessages]);
  const introCopy = typeof introMessage === 'string' ? introMessage.trim() : '';
  const hasIntroMessage = introCopy.length > 0;
  const emptyStateCopy =
    isSelectionExplainPendingMode || isSectionExplainPendingMode
      ? panelEmptyStateMessage
      : isAskModalMode
        ? askModalHelperText
        : emptyStateMessage;
  const shouldRenderEmptyState = Boolean(emptyStateCopy?.trim()) && !hasIntroMessage;
  const chatTitleSuffix = tutorContent.narrator?.chatTitleSuffix ?? '';
  const tutorName = tutor?.tutorName ?? tutorContent.common.defaultTutorName;
  const conversationLabel = `${tutorName} ${chatTitleSuffix}`.trim();
  const compactActionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 text-xs touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';

  return (
    <div
      className='flex-1 min-h-0 space-y-3 overflow-y-auto kangur-chat-padding-lg'
      role='log'
      aria-live='polite'
      aria-relevant='additions text'
      aria-atomic='false'
      aria-busy={isLoading ? 'true' : undefined}
      aria-label={conversationLabel}
    >
      {hasIntroMessage ? (
        <div className='flex justify-start'>
          <div className='w-full max-w-full space-y-2 sm:max-w-[90%]'>
            <div className='tutor-assistant-bubble kangur-chat-padding-sm text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] whitespace-pre-line break-words'>
              {introCopy}
            </div>
          </div>
        </div>
      ) : null}
      {visibleMessages.length === 0 ? (
        shouldRenderEmptyState ? (
        <div className='flex flex-col items-center justify-center py-6'>
          <div
            className='mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full kangur-chat-surface-warm kangur-chat-surface-warm-shadow [color:var(--kangur-chat-kicker-text,var(--kangur-page-text))]'
          >
            <span className='text-lg'>?</span>
          </div>
          <p className='max-w-[240px] text-center text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
            {emptyStateCopy}
          </p>
        </div>
        ) : null
      ) : (
        visibleMessages.map((msg, index) => {
          const messageArtifacts = getMessageArtifacts(
            msg,
            drawingContent?.previewAlt ?? 'Rysunek'
          );

          if (msg.role === 'user') {
            const userDrawingArtifacts = messageArtifacts.filter(
              (artifact) => artifact.type === 'user_drawing'
            );

            return (
              <div key={index} className='flex justify-end'>
                <div className='max-w-[92%] space-y-2 sm:max-w-[80%]'>
                  {userDrawingArtifacts.map((artifact, artifactIndex) => (
                    <div key={`${index}-${artifactIndex}`} className='flex justify-end'>
                      <div className='space-y-1 text-right'>
                        <span className='text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
                          {drawingContent?.messageLabel ?? 'Narysowano'}
                        </span>
                        <img
                          src={artifact.imageDataUrl}
                          alt={artifact.alt ?? drawingContent?.previewAlt ?? 'Rysunek'}
                          data-testid={`kangur-ai-tutor-drawing-message-${index}`}
                          className='max-h-32 w-auto kangur-chat-card border kangur-chat-user-drawing-shadow [border-color:var(--kangur-chat-user-drawing-border,var(--kangur-chat-user-bubble-border,rgba(253,186,116,0.5)))]'
                        />
                      </div>
                    </div>
                  ))}
                  <div className='kangur-chat-bubble kangur-chat-padding-sm border tutor-user-bubble text-sm leading-relaxed break-words'>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          }

          const feedbackKey = getAssistantMessageFeedbackKey(tutorSessionKey, index, msg);
          const submittedFeedback = messageFeedbackByKey[feedbackKey] ?? null;
          const assistantDrawingArtifacts = messageArtifacts.filter(
            (artifact) => artifact.type === 'assistant_drawing'
          );
          const isHintResponseCandidate =
            msg.coachingFrame?.mode === 'hint_ladder' ||
            lastPromptMode === 'hint' ||
            lastInteractionIntent === 'hint';
          const shouldShowHintFollowUp =
            Boolean(hintQuickAction) && index === lastAssistantMessageIndex && isHintResponseCandidate;

          return (
            <div key={index} className='flex justify-start'>
              <div className='w-full max-w-full space-y-2 sm:max-w-[90%]'>
                {msg.coachingFrame ? (
                  <div
                    className='tutor-coaching-frame kangur-chat-inset kangur-chat-padding-sm text-left'
                    data-testid='kangur-ai-tutor-coaching-frame'
                    data-coaching-mode={msg.coachingFrame.mode}
                  >
                    <div className='flex items-center gap-1.5'>
                      <span className='inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] [background:var(--kangur-chat-info-pill-background,rgba(186,230,253,0.7))] [color:var(--kangur-chat-info-pill-text,var(--kangur-chat-info-text,var(--kangur-chat-panel-text,var(--kangur-page-text))))]'>
                        {COACHING_MODE_ICON[msg.coachingFrame.mode]}
                      </span>
                      <span className='text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-info-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
                        {msg.coachingFrame.label}
                      </span>
                    </div>
                    <div className='mt-1.5 text-xs font-medium leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                      {msg.coachingFrame.description}
                    </div>
                    {msg.coachingFrame.rationale ? (
                      <div className='mt-1 text-[11px] leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                        {msg.coachingFrame.rationale}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {assistantDrawingArtifacts.map((artifact, artifactIndex) => (
                  <div
                    key={`${index}-${artifactIndex}`}
                    className='soft-card overflow-hidden kangur-chat-card border kangur-chat-surface-soft kangur-chat-surface-soft-shadow'
                    data-testid={`kangur-ai-tutor-assistant-drawing-message-${index}-${artifactIndex}`}
                  >
                    <div className='flex items-center justify-between border-b kangur-chat-padding-sm kangur-chat-divider'>
                      <span className='text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                        {artifact.title ?? 'Szkic tutora'}
                      </span>
                      <span className='text-[10px] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                        {drawingContent?.messageLabel ?? 'Narysowano'}
                      </span>
                    </div>
                    <div className='kangur-chat-padding-md'>
                      <div
                        role='img'
                        aria-label={artifact.alt ?? drawingContent?.previewAlt ?? 'Rysunek'}
                        className='overflow-hidden kangur-chat-inset border [border-color:var(--kangur-chat-surface-soft-border,var(--kangur-soft-card-border))] [background:var(--kangur-soft-card-background)] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full'
                        dangerouslySetInnerHTML={{
                          __html: sanitizeSvg(artifact.svgContent, { viewBox: '0 0 320 200' }),
                        }}
                      />
                      {artifact.caption ? (
                        <div className='mt-2 text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                          {artifact.caption}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                <div className='tutor-assistant-bubble kangur-chat-padding-sm text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] break-words'>
                  {msg.content}
                </div>
                {shouldShowHintFollowUp ? (
                  <div
                    data-testid='kangur-ai-tutor-hint-followup'
                    className='soft-card kangur-chat-card kangur-chat-padding-md border kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
                  >
                    <div className='text-xs font-medium leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                      {tutorContent.messageList.hintFollowUpQuestion}
                    </div>
                    <div className='mt-2'>
                      <KangurButton
                        data-testid='kangur-ai-tutor-hint-followup-cta'
                        type='button'
                        size='sm'
                        variant='primary'
                        disabled={isLoading || !canSendMessages}
                        className={compactActionClassName}
                        onClick={() => void handleQuickAction(hintQuickAction)}
                      >
                        {tutorContent.messageList.hintFollowUpActionLabel}
                      </KangurButton>
                    </div>
                  </div>
                ) : null}
                {msg.answerResolutionMode === 'page_content' ? (
                  <div
                    data-testid='kangur-ai-tutor-page-content-answer-badge'
                    className='inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] kangur-chat-surface-soft [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
                  >
                    Zapisana treść strony
                  </div>
                ) : null}
                {msg.followUpActions?.length ? (
                  <div className='space-y-2'>
                    <div className='text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                      {tutorContent.messageList.followUpTitle}
                    </div>
                    <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
                      {msg.followUpActions.map((action) => {
                        const followUpHref = toFollowUpHref(basePath, action);

                        return (
                          <div
                            key={action.id}
                            className='soft-card kangur-chat-card kangur-chat-padding-md border kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
                          >
                            {action.reason ? (
                              <div className='text-xs font-medium leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                                {action.reason}
                              </div>
                            ) : null}
                            <div
                              data-kangur-tts-ignore='true'
                              className={cn(action.reason ? 'mt-2' : 'mt-0')}
                            >
                              <KangurButton asChild size='sm' variant='primary' className='w-full'>
                                <Link
                                  href={followUpHref}
                                  onClick={() =>
                                    handleFollowUpClick(action, index, followUpHref)
                                  }
                                  targetPageKey={action.page}
                                  transitionAcknowledgeMs={
                                    AI_TUTOR_FOLLOW_UP_ROUTE_ACKNOWLEDGE_MS
                                  }
                                  transitionSourceId={`ai-tutor-follow-up:${action.id}`}
                                >
                                  {action.label}
                                </Link>
                              </KangurButton>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {showSources && msg.sources?.length ? (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                      <span className='inline-flex h-1 w-1 rounded-full [background:var(--kangur-soft-card-border)]' />
                      {tutorContent.messageList.sourcesTitle}
                    </div>
                    {msg.sources.slice(0, 3).map((source) => (
                      <div
                        key={`${source.collectionId}-${source.documentId}`}
                        className='soft-card kangur-chat-card kangur-chat-padding-sm border kangur-chat-surface-soft kangur-chat-surface-soft-shadow text-left'
                      >
                        <div className='text-[11px] font-semibold [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                          {source.metadata?.title?.trim() || `[doc:${source.documentId}]`}
                        </div>
                        <div className='mt-0.5 text-[10px] uppercase tracking-[0.14em] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                          {source.collectionId} · score {source.score.toFixed(3)}
                        </div>
                        {source.text?.trim() ? (
                          <div className='mt-1 text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                            {source.text.trim().slice(0, 180)}
                            {source.text.trim().length > 180 ? '…' : ''}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {msg.websiteHelpTarget ? (
                  (() => {
                    const websiteHelpTargetHref = toWebsiteHelpTargetHref(
                      basePath,
                      msg.websiteHelpTarget
                    );

                    return (
                  <div
                    data-kangur-tts-ignore='true'
                    className='soft-card kangur-chat-card kangur-chat-padding-md border kangur-chat-surface-info kangur-chat-surface-info-shadow'
                  >
                    <div className='text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-info-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'>
                      Miejsce na stronie
                    </div>
                    <div className='mt-1 text-xs leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                      {msg.websiteHelpTarget.label}
                    </div>
                    <div className='mt-2'>
                      <KangurButton
                        asChild
                        size='sm'
                        variant='primary'
                        className={compactActionClassName}
                      >
                        <Link
                          href={websiteHelpTargetHref}
                          onClick={() =>
                            handleWebsiteHelpTargetClick(
                              msg.websiteHelpTarget as NonNullable<
                                TutorRenderedMessage['websiteHelpTarget']
                              >,
                              index,
                              websiteHelpTargetHref
                            )
                          }
                          title={msg.websiteHelpTarget.anchorId ?? undefined}
                        >
                          Przejdź do tego miejsca
                        </Link>
                      </KangurButton>
                    </div>
                  </div>
                    );
                  })()
                ) : null}
                <div
                  data-testid={`kangur-ai-tutor-feedback-${index}`}
                  data-kangur-tts-ignore='true'
                  className='soft-card kangur-chat-card kangur-chat-padding-sm border kangur-chat-surface-soft'
                >
                  <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
                    <span className='text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                      {tutorContent.messageList.helpfulPrompt}
                    </span>
                    <KangurButton
                      data-testid={`kangur-ai-tutor-feedback-helpful-${index}`}
                      type='button'
                      size='sm'
                      variant='surface'
                      aria-pressed={submittedFeedback === 'helpful'}
                      disabled={submittedFeedback !== null}
                      className={cn(
                        isCoarsePointer
                          ? 'min-h-11 px-4 text-xs touch-manipulation select-none active:scale-[0.97]'
                          : 'h-8 px-3 text-[11px]',
                        submittedFeedback === 'helpful'
                          ? 'kangur-chat-feedback-positive'
                          : ''
                      )}
                      onClick={() => handleMessageFeedback(index, msg, 'helpful')}
                    >
                      {tutorContent.messageList.helpfulYesLabel}
                    </KangurButton>
                    <KangurButton
                      data-testid={`kangur-ai-tutor-feedback-not-helpful-${index}`}
                      type='button'
                      size='sm'
                      variant='surface'
                      aria-pressed={submittedFeedback === 'not_helpful'}
                      disabled={submittedFeedback !== null}
                      className={cn(
                        isCoarsePointer
                          ? 'min-h-11 px-4 text-xs touch-manipulation select-none active:scale-[0.97]'
                          : 'h-8 px-3 text-[11px]',
                        submittedFeedback === 'not_helpful'
                          ? 'kangur-chat-feedback-negative'
                          : ''
                      )}
                      onClick={() => handleMessageFeedback(index, msg, 'not_helpful')}
                    >
                      {tutorContent.messageList.helpfulNoLabel}
                    </KangurButton>
                  </div>
                  {submittedFeedback ? (
                    <div
                      data-testid={`kangur-ai-tutor-feedback-status-${index}`}
                      className='mt-2 text-[11px] leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
                    >
                      {submittedFeedback === 'helpful'
                        ? tutorContent.messageList.helpfulStatus
                        : tutorContent.messageList.notHelpfulStatus}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })
      )}
      {isLoading ? (
        <div className='flex justify-start'>
          <div className='tutor-assistant-bubble kangur-chat-padding-md'>
            <div
              className='flex items-center gap-1.5'
              role='status'
              aria-live='polite'
              aria-atomic='true'
              aria-label={tutorContent.messageList.loadingLabel}
            >
              <span className='tutor-typing-dot' />
              <span className='tutor-typing-dot' />
              <span className='tutor-typing-dot' />
            </div>
          </div>
        </div>
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );
}
