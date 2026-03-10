import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import {
  getAssistantMessageFeedbackKey,
  toFollowUpHref,
} from './KangurAiTutorWidget.helpers';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { JSX } from 'react';

export function KangurAiTutorMessageList(): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const {
    askModalHelperText,
    basePath,
    emptyStateMessage,
    handleFollowUpClick,
    handleMessageFeedback,
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

  return (
    <div className='flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-3'>
      {messages.length === 0 ? (
        <p className='py-4 text-center text-xs text-slate-500'>
          {isSelectionExplainPendingMode || isSectionExplainPendingMode
            ? panelEmptyStateMessage
            : isAskModalMode
              ? askModalHelperText
              : emptyStateMessage}
        </p>
      ) : (
        messages.map((msg, index) => {
          if (msg.role === 'user') {
            return (
              <div key={index} className='flex justify-end'>
                <div className='max-w-[80%] rounded-[22px] border border-orange-400 bg-gradient-to-br from-orange-400 to-amber-500 px-3 py-2 text-sm leading-relaxed text-white shadow-[0_16px_28px_-20px_rgba(249,115,22,0.58)]'>
                  {msg.content}
                </div>
              </div>
            );
          }

          const feedbackKey = getAssistantMessageFeedbackKey(tutorSessionKey, index, msg);
          const submittedFeedback = messageFeedbackByKey[feedbackKey] ?? null;

          return (
            <div key={index} className='flex justify-start'>
              <div className='w-full max-w-[90%] space-y-2'>
                {msg.coachingFrame ? (
                  <div
                    className='rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-2 text-left shadow-sm'
                    data-testid='kangur-ai-tutor-coaching-frame'
                    data-coaching-mode={msg.coachingFrame.mode}
                  >
                    <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-600'>
                      {msg.coachingFrame.label}
                    </div>
                    <div className='mt-1 text-xs font-medium leading-relaxed text-slate-700'>
                      {msg.coachingFrame.description}
                    </div>
                    {msg.coachingFrame.rationale ? (
                      <div className='mt-1 text-[11px] leading-relaxed text-slate-500'>
                        {msg.coachingFrame.rationale}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className='rounded-[22px] border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm'>
                  {msg.content}
                </div>
                {msg.followUpActions?.length ? (
                  <div className='space-y-2'>
                    <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
                      {tutorContent.messageList.followUpTitle}
                    </div>
                    <div className='grid gap-2 sm:grid-cols-2'>
                      {msg.followUpActions.map((action) => {
                        const followUpHref = toFollowUpHref(basePath, action);

                        return (
                          <div
                            key={action.id}
                            className='rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3'
                          >
                            {action.reason ? (
                              <div className='text-xs font-medium leading-relaxed text-slate-700'>
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
                    <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
                      {tutorContent.messageList.sourcesTitle}
                    </div>
                    {msg.sources.slice(0, 3).map((source) => (
                      <div
                        key={`${source.collectionId}-${source.documentId}`}
                        className='rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-left shadow-sm'
                      >
                        <div className='text-[11px] font-semibold text-slate-700'>
                          {source.metadata?.title?.trim() || `[doc:${source.documentId}]`}
                        </div>
                        <div className='mt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400'>
                          {source.collectionId} · score {source.score.toFixed(3)}
                        </div>
                        {source.text?.trim() ? (
                          <div className='mt-1 text-xs leading-relaxed text-slate-600'>
                            {source.text.trim().slice(0, 180)}
                            {source.text.trim().length > 180 ? '…' : ''}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div
                  data-testid={`kangur-ai-tutor-feedback-${index}`}
                  data-kangur-tts-ignore='true'
                  className='rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2'
                >
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
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
                      className='mt-2 text-[11px] leading-relaxed text-slate-500'
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
          <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2'>
            <span className='animate-pulse text-xs text-slate-400'>
              {tutorContent.messageList.loadingLabel}
            </span>
          </div>
        </div>
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );
}
