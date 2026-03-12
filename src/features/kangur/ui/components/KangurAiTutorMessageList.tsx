import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { cn, sanitizeSvg } from '@/shared/utils';

import type { KangurAiTutorRuntimeMessage as TutorRenderedMessage } from '@/shared/contracts/kangur-ai-tutor';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import {
  getAssistantMessageFeedbackKey,
  toFollowUpHref,
  toWebsiteHelpTargetHref,
} from './KangurAiTutorWidget.helpers';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { JSX } from 'react';

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

export function KangurAiTutorMessageList(): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const drawingContent = (tutorContent as { drawing?: TutorDrawingContent }).drawing;
  const {
    askModalHelperText,
    basePath,
    emptyStateMessage,
    handleFollowUpClick,
    handleMessageFeedback,
    handleWebsiteHelpTargetClick,
    isAskModalMode,
    isLoading,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    messages,
    panelEmptyStateMessage,
    showSources,
    tutorSessionKey,
  } = useKangurAiTutorPanelBodyContext();
  const { messageFeedbackByKey, messagesEndRef } = useKangurAiTutorWidgetStateContext();
  const shouldSuppressConversationHistory =
    isSelectionExplainPendingMode || isSectionExplainPendingMode;
  const visibleMessages = shouldSuppressConversationHistory ? [] : messages;

  return (
    <div className='flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-3'>
      {visibleMessages.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-6'>
          <div
            className='mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-amber-600 shadow-[0_6px_16px_-10px_rgba(245,158,11,0.24)]'
            style={{
              background:
                'color-mix(in srgb, var(--kangur-soft-card-background) 78%, rgba(254,243,199,0.9))',
            }}
          >
            <span className='text-lg'>?</span>
          </div>
          <p className='max-w-[240px] text-center text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
            {isSelectionExplainPendingMode || isSectionExplainPendingMode
              ? panelEmptyStateMessage
              : isAskModalMode
                ? askModalHelperText
                : emptyStateMessage}
          </p>
        </div>
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
                        <span className='text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500'>
                          {drawingContent?.messageLabel ?? 'Narysowano'}
                        </span>
                        <img
                          src={artifact.imageDataUrl}
                          alt={artifact.alt ?? drawingContent?.previewAlt ?? 'Rysunek'}
                          data-testid={`kangur-ai-tutor-drawing-message-${index}`}
                          className='max-h-32 w-auto rounded-2xl border border-orange-300/50 shadow-[0_8px_20px_-12px_rgba(249,115,22,0.3)]'
                        />
                      </div>
                    </div>
                  ))}
                  <div className='rounded-[22px] border border-orange-400/60 tutor-user-bubble px-3 py-2 text-sm leading-relaxed text-white'>
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

          return (
            <div key={index} className='flex justify-start'>
              <div className='w-full max-w-full space-y-2 sm:max-w-[90%]'>
                {msg.coachingFrame ? (
                  <div
                    className='tutor-coaching-frame rounded-2xl px-3 py-2.5 text-left'
                    data-testid='kangur-ai-tutor-coaching-frame'
                    data-coaching-mode={msg.coachingFrame.mode}
                  >
                    <div className='flex items-center gap-1.5'>
                      <span className='inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-200/70 text-[8px] text-sky-700'>
                        {COACHING_MODE_ICON[msg.coachingFrame.mode]}
                      </span>
                      <span className='text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700'>
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
                    className='soft-card overflow-hidden rounded-[22px] border [border-color:var(--kangur-soft-card-border)] shadow-[0_12px_28px_-18px_rgba(15,23,42,0.22)]'
                    style={{
                      background:
                        'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background) 94%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 88%, rgba(255,247,237,0.92)) 100%)',
                    }}
                    data-testid={`kangur-ai-tutor-assistant-drawing-message-${index}-${artifactIndex}`}
                  >
                    <div className='flex items-center justify-between border-b px-3 py-2 [border-color:var(--kangur-soft-card-border)]'>
                      <span className='text-[10px] font-semibold uppercase tracking-[0.16em] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                        {artifact.title ?? 'Szkic tutora'}
                      </span>
                      <span className='text-[10px] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                        {drawingContent?.messageLabel ?? 'Narysowano'}
                      </span>
                    </div>
                    <div className='px-3 py-3'>
                      <div
                        role='img'
                        aria-label={artifact.alt ?? drawingContent?.previewAlt ?? 'Rysunek'}
                        className='overflow-hidden rounded-2xl border border-amber-200/50 [background:var(--kangur-soft-card-background)] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full'
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
                <div className='tutor-assistant-bubble rounded-[22px] border [border-color:var(--kangur-soft-card-border)] px-3 py-2 text-sm leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                  {msg.content}
                </div>
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
                            className='soft-card rounded-2xl border px-3 py-3 shadow-[0_6px_16px_-10px_rgba(245,158,11,0.18)]'
                            style={{
                              background:
                                'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 84%, rgba(254,243,199,0.92)) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(255,237,213,0.82)) 100%)',
                              borderColor:
                                'color-mix(in srgb, var(--kangur-soft-card-border) 76%, rgb(251 191 36))',
                            }}
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
                        className='soft-card rounded-2xl border [border-color:var(--kangur-soft-card-border)] px-3 py-2 text-left shadow-[0_4px_12px_-8px_rgba(15,23,42,0.08)]'
                        style={{
                          background:
                            'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 92%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 84%, var(--kangur-page-background)) 100%)',
                        }}
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
                    className='soft-card rounded-2xl border border-sky-200/80 px-3 py-3 shadow-[0_8px_18px_-12px_rgba(14,165,233,0.22)]'
                    style={{
                      background:
                        'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 88%, rgba(224,242,254,0.9)) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 86%, rgba(239,246,255,0.82)) 100%)',
                    }}
                  >
                    <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700'>
                      Miejsce na stronie
                    </div>
                    <div className='mt-1 text-xs leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                      {msg.websiteHelpTarget.label}
                    </div>
                    <div className='mt-2'>
                      <KangurButton asChild size='sm' variant='primary' className='w-full sm:w-auto'>
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
                  className='soft-card rounded-2xl border [border-color:var(--kangur-soft-card-border)] px-3 py-2'
                  style={{
                    background:
                      'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 90%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 82%, var(--kangur-page-background)) 100%)',
                  }}
                >
                  <div className='flex flex-wrap items-center gap-2'>
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
                        'h-8 px-3 text-[11px]',
                        submittedFeedback === 'helpful'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
                        'h-8 px-3 text-[11px]',
                        submittedFeedback === 'not_helpful'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
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
          <div className='tutor-assistant-bubble rounded-[22px] border [border-color:var(--kangur-soft-card-border)] px-4 py-3'>
            <div className='flex items-center gap-1.5' aria-label={tutorContent.messageList.loadingLabel}>
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
