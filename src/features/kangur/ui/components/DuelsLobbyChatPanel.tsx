'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurPanelRow,
  KangurStatusChip,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_SPACED_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_START_ROW_SPACED_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import { formatRelativeAge, resolveLobbyHostInitial } from '@/features/kangur/ui/pages/duels/duels-helpers';
import { useKangurLobbyChat } from '@/features/kangur/ui/hooks/useKangurLobbyChat';
import { cn } from '@/features/kangur/shared/utils';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

const LOBBY_CHAT_GROUP_WINDOW_MS = 2 * 60 * 1000;
const LOBBY_CHAT_SCROLL_THRESHOLD_PX = 16;
const LOBBY_CHAT_UNREAD_CAP = 99;

type DuelsLobbyChatPanelProps = {
  enabled: boolean;
  isOnline: boolean;
  canPost: boolean;
  relativeNow: number;
  activeLearnerId?: string | null;
  onRequireLogin: () => void;
};

export function DuelsLobbyChatPanel(props: DuelsLobbyChatPanelProps): React.JSX.Element {
  const chatTranslations = useTranslations('KangurDuels.chat');
  const commonTranslations = useTranslations('KangurDuels.common');
  const isCoarsePointer = useKangurCoarsePointer();
  const { enabled, isOnline, canPost, relativeNow, activeLearnerId, onRequireLogin } = props;
  const {
    messages,
    isLoading,
    isLoadingOlder,
    isSending,
    isStreaming,
    error,
    lastUpdatedAt,
    nextCursor,
    refresh,
    loadOlder,
    sendMessage,
    maxMessageLength,
  } = useKangurLobbyChat({
    enabled,
    isOnline,
    streamEnabled: true,
  });
  const [draft, setDraft] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(0);

  const remainingChars = useMemo(
    () => Math.max(0, maxMessageLength - draft.length),
    [draft.length, maxMessageLength]
  );
  const nearLimit = remainingChars <= 20;
  const hasMessages = messages.length > 0;
  const canLoadOlder = Boolean(nextCursor) && isOnline;
  const canSend =
    enabled &&
    isOnline &&
    canPost &&
    !isSending &&
    draft.trim().length > 0 &&
    draft.trim().length <= maxMessageLength;
  const compactActionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';

  const resolveIsAtBottom = useCallback((container: HTMLDivElement | null): boolean => {
    if (!container) {
      return true;
    }
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= LOBBY_CHAT_SCROLL_THRESHOLD_PX;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto'): void => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scroll = () => {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: container.scrollHeight, behavior });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    };
    requestAnimationFrame(scroll);
  }, []);

  const groupedMessages = useMemo(
    () =>
      messages.map((message, index) => {
        const previous = messages[index - 1];
        const previousTime = previous ? new Date(previous.createdAt).getTime() : null;
        const messageTime = new Date(message.createdAt).getTime();
        const isGrouped =
          previous?.senderId === message.senderId &&
          previousTime !== null &&
          messageTime - previousTime <= LOBBY_CHAT_GROUP_WINDOW_MS;
        return {
          message,
          isGrouped: Boolean(isGrouped),
          isOwn: Boolean(activeLearnerId && message.senderId === activeLearnerId),
        };
      }),
    [messages, activeLearnerId]
  );

  const handleSend = async (): Promise<void> => {
    if (!canPost) {
      onRequireLogin();
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed || !canSend) {
      return;
    }
    try {
      await sendMessage({ message: trimmed });
      setDraft('');
    } catch (error) {
      void ErrorSystem.captureException(error);
      // errors are handled in hook state
    }
  };

  const handleLoadOlder = async (): Promise<void> => {
    if (!canLoadOlder || isLoadingOlder) {
      return;
    }
    const container = scrollContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    await loadOlder();

    if (container) {
      requestAnimationFrame(() => {
        const nextScrollHeight = container.scrollHeight;
        const delta = nextScrollHeight - previousScrollHeight;
        container.scrollTop = previousScrollTop + delta;
      });
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const handleScroll = () => {
      const atBottom = resolveIsAtBottom(container);
      setIsAtBottom(atBottom);
      if (atBottom) {
        setUnreadCount(0);
      }
    };
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [resolveIsAtBottom]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const previousCount = previousMessageCountRef.current;
    const nextCount = messages.length;
    previousMessageCountRef.current = nextCount;

    if (!container || nextCount === 0 || nextCount <= previousCount) {
      return;
    }

    const atBottom = resolveIsAtBottom(container);
    setIsAtBottom(atBottom);

    if (atBottom) {
      scrollToBottom('auto');
      setUnreadCount(0);
    } else {
      const increment = nextCount - previousCount;
      setUnreadCount((current) =>
        Math.min(LOBBY_CHAT_UNREAD_CAP, current + Math.max(1, increment))
      );
    }
  }, [messages, resolveIsAtBottom, scrollToBottom]);

  return (
    <KangurGlassPanel
      className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
      padding='lg'
      surface='solid'
      role='region'
      aria-labelledby='kangur-lobby-chat-heading'
    >
      <KangurPanelRow className='sm:flex-wrap sm:items-center sm:justify-between'>
        <div className='space-y-1'>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <h3 id='kangur-lobby-chat-heading' className='text-xl font-semibold text-slate-900'>
              {chatTranslations('heading')}
            </h3>
            <KangurStatusChip accent='slate' size='sm'>
              {messages.length}
            </KangurStatusChip>
          </div>
          <p className='text-sm text-slate-600'>
            {chatTranslations('description')}
          </p>
        </div>
        <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
          {!isAtBottom && unreadCount > 0 ? (
            <KangurButton
              onClick={() => {
                scrollToBottom('smooth');
                setUnreadCount(0);
                setIsAtBottom(true);
              }}
              variant='secondary'
              className={compactActionClassName}
            >
              {chatTranslations('unreadButton', { count: unreadCount })}
            </KangurButton>
          ) : null}
          {!isOnline ? (
            <KangurStatusChip accent='rose' size='sm'>
              {chatTranslations('chips.offline')}
            </KangurStatusChip>
          ) : isStreaming ? (
            <KangurStatusChip accent='emerald' size='sm'>
              {chatTranslations('chips.live')}
            </KangurStatusChip>
          ) : (
            <KangurStatusChip accent='slate' size='sm'>
              {chatTranslations('chips.refreshing')}
            </KangurStatusChip>
          )}
          {lastUpdatedAt ? (
            <KangurStatusChip accent='slate' size='sm'>
              {chatTranslations('updated', {
                value: formatRelativeAge(lastUpdatedAt, relativeNow, commonTranslations),
              })}
            </KangurStatusChip>
          ) : null}
          <KangurButton
            onClick={() => {
              void refresh();
            }}
            variant='ghost'
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={chatTranslations('refreshAria')}
            className={compactActionClassName}
          >
            {isLoading ? chatTranslations('refreshing') : chatTranslations('refresh')}
          </KangurButton>
        </div>
      </KangurPanelRow>

      {error ? (
        <KangurInfoCard accent='rose' padding='md' tone='accent' role='alert' aria-live='assertive'>
          {error}
        </KangurInfoCard>
      ) : null}

      <div
        ref={scrollContainerRef}
        className='max-h-[52vh] overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/70 p-3 sm:max-h-[320px] sm:p-4'
        role='log'
        aria-live='polite'
        aria-busy={isLoading}
      >
        {isLoading && !hasMessages ? (
          <div className={KANGUR_STACK_SPACED_CLASSNAME}>
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={`chat-skeleton-${index}`}
                className='h-12 rounded-2xl bg-slate-200/70 animate-pulse'
                aria-hidden='true'
              />
            ))}
          </div>
        ) : !hasMessages ? (
          <div className='text-sm text-slate-600'>
            {chatTranslations('empty')}
          </div>
        ) : (
          <div className={KANGUR_STACK_SPACED_CLASSNAME}>
            {canLoadOlder ? (
              <div className='flex justify-center'>
                <KangurButton
                  onClick={() => {
                    void handleLoadOlder();
                  }}
                  variant='ghost'
                  disabled={isLoadingOlder}
                  aria-busy={isLoadingOlder}
                >
                  {isLoadingOlder
                    ? chatTranslations('loadingOlder')
                    : chatTranslations('loadOlder')}
                </KangurButton>
              </div>
            ) : null}
            <ul className={KANGUR_STACK_SPACED_CLASSNAME} role='list'>
              {groupedMessages.map(({ message, isGrouped, isOwn }) => {
                const avatar = getKangurAvatarById(message.senderAvatarId);
                const avatarLabel = `${message.senderName} avatar`;

                return (
                  <li
                    key={message.id}
                    className={cn(
                      KANGUR_START_ROW_SPACED_CLASSNAME,
                      isOwn ? 'flex-row-reverse text-right' : null
                    )}
                  >
                    {isGrouped ? (
                      <div className='h-10 w-10' aria-hidden='true' />
                    ) : avatar ? (
                      <img
                        src={avatar.src}
                        alt={avatarLabel}
                        className='h-10 w-10 rounded-2xl border border-white/80 bg-white/80 object-cover shadow-sm'
                        loading='lazy'
                        aria-hidden='true'
                      />
                    ) : (
                      <div
                        className='flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-bold text-indigo-700'
                        aria-hidden='true'
                      >
                        {resolveLobbyHostInitial(message.senderName)}
                      </div>
                    )}
                    <div
                      className={cn(
                        'min-w-0 flex-1',
                        isGrouped ? 'pt-1' : '',
                        isOwn ? 'flex flex-col items-end' : null
                      )}
                    >
                      {!isGrouped ? (
                        <div
                          className={cn(
                            'flex flex-wrap items-baseline gap-2',
                            isOwn ? 'justify-end' : null
                          )}
                          >
                          <span className='text-sm font-semibold text-slate-800'>
                            {isOwn ? chatTranslations('you') : message.senderName}
                          </span>
                          <span className='text-xs text-slate-500'>
                            {formatRelativeAge(
                              message.createdAt,
                              relativeNow,
                              commonTranslations
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className='text-xs text-slate-500'>
                          {formatRelativeAge(
                            message.createdAt,
                            relativeNow,
                            commonTranslations
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          'mt-1 inline-flex max-w-full rounded-2xl border px-3 py-2 text-sm shadow-sm whitespace-pre-wrap break-words',
                          isOwn
                            ? 'border-indigo-400/60 bg-indigo-600 text-white'
                            : 'border-slate-200/70 bg-white/80 text-slate-700'
                        )}
                      >
                        {message.message}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {!canPost ? (
        <KangurInfoCard accent='slate' padding='md' tone='accent' role='status'>
          <KangurPanelRow className='sm:items-center sm:justify-between'>
            <span className='text-sm text-slate-700'>
              {chatTranslations('loginPrompt')}
            </span>
            <KangurButton
              onClick={onRequireLogin}
              variant='secondary'
              className={compactActionClassName}
            >
              {chatTranslations('loginButton')}
            </KangurButton>
          </KangurPanelRow>
        </KangurInfoCard>
      ) : null}

      <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
        <KangurPanelRow className='sm:items-center'>
          <KangurTextField
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              !enabled
                ? chatTranslations('placeholders.paused')
                : canPost
                ? chatTranslations('placeholders.default')
                : chatTranslations('placeholders.loginRequired')
            }
            aria-label={chatTranslations('messageAria')}
            disabled={!enabled || !canPost || !isOnline || isSending}
            maxLength={maxMessageLength}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
                if (event.nativeEvent && 'isComposing' in event.nativeEvent && event.nativeEvent.isComposing) {
                  return;
                }
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <KangurButton
            onClick={() => {
              void handleSend();
            }}
            variant='primary'
            disabled={!canSend}
            aria-busy={isSending}
            className={compactActionClassName}
          >
            {isSending ? chatTranslations('sending') : chatTranslations('send')}
          </KangurButton>
        </KangurPanelRow>
        <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} text-xs text-slate-500 sm:items-center sm:justify-between`}>
          <span
            className={cn(
              remainingChars === 0
                ? 'text-rose-600'
                : nearLimit
                  ? 'text-amber-600'
                  : 'text-slate-500'
            )}
          >
            {chatTranslations('remainingCharacters', { count: remainingChars })}
          </span>
          {canPost && !isOnline ? <span>{chatTranslations('offlineNotice')}</span> : null}
        </div>
      </div>
    </KangurGlassPanel>
  );
}
