'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurStatusChip,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import { formatRelativeAge, resolveLobbyHostInitial } from '@/features/kangur/ui/pages/duels/duels-helpers';
import { useKangurLobbyChat } from '@/features/kangur/ui/hooks/useKangurLobbyChat';
import { cn } from '@/features/kangur/shared/utils';

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
    } catch {
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
      <div className='flex flex-wrap items-center justify-between kangur-panel-gap'>
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 id='kangur-lobby-chat-heading' className='text-xl font-semibold text-slate-900'>
              Czat lobby
            </h3>
            <KangurStatusChip accent='slate' size='sm'>
              {messages.length}
            </KangurStatusChip>
          </div>
          <p className='text-sm text-slate-600'>
            Porozmawiaj z graczami, zanim dołączysz do pojedynku.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {!isAtBottom && unreadCount > 0 ? (
            <KangurButton
              onClick={() => {
                scrollToBottom('smooth');
                setUnreadCount(0);
                setIsAtBottom(true);
              }}
              variant='secondary'
              className='w-full sm:w-auto'
            >
              Nowe wiadomości ({unreadCount})
            </KangurButton>
          ) : null}
          {!isOnline ? (
            <KangurStatusChip accent='rose' size='sm'>
              Offline
            </KangurStatusChip>
          ) : isStreaming ? (
            <KangurStatusChip accent='emerald' size='sm'>
              Na żywo
            </KangurStatusChip>
          ) : (
            <KangurStatusChip accent='slate' size='sm'>
              Odświeżanie
            </KangurStatusChip>
          )}
          {lastUpdatedAt ? (
            <KangurStatusChip accent='slate' size='sm'>
              Aktualizacja {formatRelativeAge(lastUpdatedAt, relativeNow)}
            </KangurStatusChip>
          ) : null}
          <KangurButton
            onClick={() => {
              void refresh();
            }}
            variant='ghost'
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label='Odśwież czat lobby'
          >
            {isLoading ? 'Odświeżamy…' : 'Odśwież'}
          </KangurButton>
        </div>
      </div>

      {error ? (
        <KangurInfoCard accent='rose' padding='md' tone='accent' role='alert' aria-live='assertive'>
          {error}
        </KangurInfoCard>
      ) : null}

      <div
        ref={scrollContainerRef}
        className='max-h-[320px] overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/70 p-4'
        role='log'
        aria-live='polite'
        aria-busy={isLoading}
      >
        {isLoading && !hasMessages ? (
          <div className='flex flex-col gap-3'>
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
            Brak wiadomości. Napisz pierwszą, aby rozpocząć rozmowę.
          </div>
        ) : (
          <div className='flex flex-col gap-3'>
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
                  {isLoadingOlder ? 'Ładujemy…' : 'Załaduj starsze'}
                </KangurButton>
              </div>
            ) : null}
            <ul className='flex flex-col gap-3' role='list'>
              {groupedMessages.map(({ message, isGrouped, isOwn }) => {
                const avatar = getKangurAvatarById(message.senderAvatarId);
                const avatarLabel = `${message.senderName} avatar`;

                return (
                  <li
                    key={message.id}
                    className={cn(
                      'flex items-start gap-3',
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
                        'flex-1',
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
                            {isOwn ? 'Ty' : message.senderName}
                          </span>
                          <span className='text-xs text-slate-500'>
                            {formatRelativeAge(message.createdAt, relativeNow)}
                          </span>
                        </div>
                      ) : (
                        <div className='text-xs text-slate-500'>
                          {formatRelativeAge(message.createdAt, relativeNow)}
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
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between kangur-panel-gap'>
            <span className='text-sm text-slate-700'>
              Zaloguj się, aby pisać na czacie.
            </span>
            <KangurButton
              onClick={onRequireLogin}
              variant='secondary'
              className='w-full sm:w-auto'
            >
              Zaloguj się
            </KangurButton>
          </div>
        </KangurInfoCard>
      ) : null}

      <div className='flex flex-col gap-2'>
        <div className='flex flex-col sm:flex-row sm:items-center kangur-panel-gap'>
          <KangurTextField
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              !enabled
                ? 'Czat jest wstrzymany.'
                : canPost
                ? 'Napisz wiadomość do lobby…'
                : 'Zaloguj się, aby pisać'
            }
            aria-label='Wiadomość na czacie lobby'
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
            className='w-full sm:w-auto'
          >
            {isSending ? 'Wysyłamy…' : 'Wyślij'}
          </KangurButton>
        </div>
        <div className='flex flex-wrap items-center justify-between text-xs text-slate-500'>
          <span
            className={cn(
              remainingChars === 0
                ? 'text-rose-600'
                : nearLimit
                  ? 'text-amber-600'
                  : 'text-slate-500'
            )}
          >
            Pozostało {remainingChars} znaków
          </span>
          {canPost && !isOnline ? <span>Brak połączenia z internetem.</span> : null}
        </div>
      </div>
    </KangurGlassPanel>
  );
}
