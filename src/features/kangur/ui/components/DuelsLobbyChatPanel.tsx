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

type LobbyChatState = ReturnType<typeof useKangurLobbyChat>;
type LobbyChatMessage = LobbyChatState['messages'][number];
type LobbyChatTranslations = ReturnType<typeof useTranslations>;
type GroupedLobbyChatMessage = {
  message: LobbyChatMessage;
  isGrouped: boolean;
  isOwn: boolean;
};

type DuelsLobbyChatPanelProps = {
  enabled: boolean;
  isOnline: boolean;
  isPageActive?: boolean;
  canPost: boolean;
  relativeNow: number;
  activeLearnerId?: string | null;
  onRequireLogin: () => void;
};

type DuelsLobbyChatHeaderProps = {
  chatTranslations: LobbyChatTranslations;
  commonTranslations: LobbyChatTranslations;
  messagesCount: number;
  unreadCount: number;
  isAtBottom: boolean;
  isOnline: boolean;
  isStreaming: boolean;
  lastUpdatedAt: string | null;
  relativeNow: number;
  isLoading: boolean;
  compactActionClassName: string;
  onRefresh: () => void;
  onScrollToBottom: () => void;
};

type DuelsLobbyChatMessagesProps = {
  chatTranslations: LobbyChatTranslations;
  commonTranslations: LobbyChatTranslations;
  groupedMessages: GroupedLobbyChatMessage[];
  hasMessages: boolean;
  canLoadOlder: boolean;
  isLoading: boolean;
  isLoadingOlder: boolean;
  relativeNow: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onLoadOlder: () => void;
};

type DuelsLobbyChatComposerProps = {
  chatTranslations: LobbyChatTranslations;
  enabled: boolean;
  canPost: boolean;
  isOnline: boolean;
  isSending: boolean;
  canSend: boolean;
  draft: string;
  maxMessageLength: number;
  remainingChars: number;
  nearLimit: boolean;
  compactActionClassName: string;
  onDraftChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDraftKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
};

const resolveChatEnabled = (enabled: boolean, isPageActive: boolean): boolean =>
  enabled && isPageActive;

const resolveCanLoadOlder = (nextCursor: string | null | undefined, isOnline: boolean): boolean =>
  Boolean(nextCursor) && isOnline;

const trimChatDraft = (draft: string): string => draft.trim();

const resolveCanSend = ({
  chatEnabled,
  isOnline,
  canPost,
  isSending,
  draft,
  maxMessageLength,
}: {
  chatEnabled: boolean;
  isOnline: boolean;
  canPost: boolean;
  isSending: boolean;
  draft: string;
  maxMessageLength: number;
}): boolean => {
  const trimmedDraft = trimChatDraft(draft);
  if (!chatEnabled || !isOnline || !canPost || isSending) {
    return false;
  }
  if (trimmedDraft.length === 0) {
    return false;
  }
  return trimmedDraft.length <= maxMessageLength;
};

const resolveCompactActionClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';

const resolveChatPlaceholder = ({
  enabled,
  canPost,
  chatTranslations,
}: {
  enabled: boolean;
  canPost: boolean;
  chatTranslations: LobbyChatTranslations;
}): string => {
  if (!enabled) {
    return chatTranslations('placeholders.paused');
  }
  if (!canPost) {
    return chatTranslations('placeholders.loginRequired');
  }
  return chatTranslations('placeholders.default');
};

const shouldSubmitChatDraftFromKeyDown = (
  event: React.KeyboardEvent<HTMLInputElement>
): boolean => {
  if (event.key !== 'Enter') {
    return false;
  }
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }
  return !(event.nativeEvent && 'isComposing' in event.nativeEvent && event.nativeEvent.isComposing);
};

const resolveRemainingCharactersClassName = (
  remainingChars: number,
  nearLimit: boolean
): string => {
  if (remainingChars === 0) {
    return 'text-rose-600';
  }
  if (nearLimit) {
    return 'text-amber-600';
  }
  return 'text-slate-500';
};

const resolveConnectionStatusChip = ({
  isOnline,
  isStreaming,
  chatTranslations,
}: {
  isOnline: boolean;
  isStreaming: boolean;
  chatTranslations: LobbyChatTranslations;
}): { accent: 'rose' | 'emerald' | 'slate'; label: string } => {
  if (!isOnline) {
    return { accent: 'rose', label: chatTranslations('chips.offline') };
  }
  if (isStreaming) {
    return { accent: 'emerald', label: chatTranslations('chips.live') };
  }
  return { accent: 'slate', label: chatTranslations('chips.refreshing') };
};

const resolveUpdatedStatusLabel = ({
  lastUpdatedAt,
  relativeNow,
  commonTranslations,
  chatTranslations,
}: {
  lastUpdatedAt: string | null;
  relativeNow: number;
  commonTranslations: LobbyChatTranslations;
  chatTranslations: LobbyChatTranslations;
}): string | null => {
  if (!lastUpdatedAt) {
    return null;
  }
  return chatTranslations('updated', {
    value: formatRelativeAge(lastUpdatedAt, relativeNow, commonTranslations),
  });
};

const groupLobbyMessages = (
  messages: LobbyChatMessage[],
  activeLearnerId?: string | null
): GroupedLobbyChatMessage[] =>
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
  });

function DuelsLobbyChatHeader(props: DuelsLobbyChatHeaderProps): React.JSX.Element {
  const {
    chatTranslations,
    commonTranslations,
    messagesCount,
    unreadCount,
    isAtBottom,
    isOnline,
    isStreaming,
    lastUpdatedAt,
    relativeNow,
    isLoading,
    compactActionClassName,
    onRefresh,
    onScrollToBottom,
  } = props;
  const showUnreadButton = !isAtBottom && unreadCount > 0;
  const connectionChip = resolveConnectionStatusChip({ isOnline, isStreaming, chatTranslations });
  const updatedStatusLabel = resolveUpdatedStatusLabel({
    lastUpdatedAt,
    relativeNow,
    commonTranslations,
    chatTranslations,
  });

  return (
    <KangurPanelRow className='sm:flex-wrap sm:items-center sm:justify-between'>
      <div className='space-y-1'>
        <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
          <h3 id='kangur-lobby-chat-heading' className='text-xl font-semibold text-slate-900'>
            {chatTranslations('heading')}
          </h3>
          <KangurStatusChip accent='slate' size='sm'>
            {messagesCount}
          </KangurStatusChip>
        </div>
        <p className='text-sm text-slate-600'>{chatTranslations('description')}</p>
      </div>
      <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
        {showUnreadButton ? (
          <KangurButton
            onClick={onScrollToBottom}
            variant='secondary'
            className={compactActionClassName}
          >
            {chatTranslations('unreadButton', { count: unreadCount })}
          </KangurButton>
        ) : null}
        <KangurStatusChip accent={connectionChip.accent} size='sm'>
          {connectionChip.label}
        </KangurStatusChip>
        {updatedStatusLabel ? (
          <KangurStatusChip accent='slate' size='sm'>
            {updatedStatusLabel}
          </KangurStatusChip>
        ) : null}
        <KangurButton
          onClick={onRefresh}
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
  );
}

function DuelsLobbyChatAvatar(props: {
  message: LobbyChatMessage;
  isGrouped: boolean;
}): React.JSX.Element {
  const { message, isGrouped } = props;
  const avatar = getKangurAvatarById(message.senderAvatarId);
  const avatarLabel = `${message.senderName} avatar`;

  if (isGrouped) {
    return <div className='h-10 w-10' aria-hidden='true' />;
  }
  if (avatar) {
    return (
      <img
        src={avatar.src}
        alt={avatarLabel}
        className='h-10 w-10 rounded-2xl border border-white/80 bg-white/80 object-cover shadow-sm'
        loading='lazy'
        aria-hidden='true'
      />
    );
  }
  return (
    <div
      className='flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-bold text-indigo-700'
      aria-hidden='true'
    >
      {resolveLobbyHostInitial(message.senderName)}
    </div>
  );
}

function DuelsLobbyChatMessageMeta(props: {
  chatTranslations: LobbyChatTranslations;
  commonTranslations: LobbyChatTranslations;
  message: LobbyChatMessage;
  isGrouped: boolean;
  isOwn: boolean;
  relativeNow: number;
}): React.JSX.Element {
  const { chatTranslations, commonTranslations, message, isGrouped, isOwn, relativeNow } = props;
  const relativeAge = formatRelativeAge(message.createdAt, relativeNow, commonTranslations);

  if (isGrouped) {
    return <div className='text-xs text-slate-500'>{relativeAge}</div>;
  }

  return (
    <div className={cn('flex flex-wrap items-baseline gap-2', isOwn ? 'justify-end' : null)}>
      <span className='text-sm font-semibold text-slate-800'>
        {isOwn ? chatTranslations('you') : message.senderName}
      </span>
      <span className='text-xs text-slate-500'>{relativeAge}</span>
    </div>
  );
}

function DuelsLobbyChatMessageItem(props: {
  chatTranslations: LobbyChatTranslations;
  commonTranslations: LobbyChatTranslations;
  entry: GroupedLobbyChatMessage;
  relativeNow: number;
}): React.JSX.Element {
  const { chatTranslations, commonTranslations, entry, relativeNow } = props;
  const { message, isGrouped, isOwn } = entry;

  return (
    <li
      className={cn(KANGUR_START_ROW_SPACED_CLASSNAME, isOwn ? 'flex-row-reverse text-right' : null)}
    >
      <DuelsLobbyChatAvatar message={message} isGrouped={isGrouped} />
      <div
        className={cn(
          'min-w-0 flex-1',
          isGrouped ? 'pt-1' : '',
          isOwn ? 'flex flex-col items-end' : null
        )}
      >
        <DuelsLobbyChatMessageMeta
          chatTranslations={chatTranslations}
          commonTranslations={commonTranslations}
          message={message}
          isGrouped={isGrouped}
          isOwn={isOwn}
          relativeNow={relativeNow}
        />
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
}

function DuelsLobbyChatMessages(props: DuelsLobbyChatMessagesProps): React.JSX.Element {
  const {
    chatTranslations,
    commonTranslations,
    groupedMessages,
    hasMessages,
    canLoadOlder,
    isLoading,
    isLoadingOlder,
    relativeNow,
    scrollContainerRef,
    onLoadOlder,
  } = props;

  return (
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
        <div className='text-sm text-slate-600'>{chatTranslations('empty')}</div>
      ) : (
        <div className={KANGUR_STACK_SPACED_CLASSNAME}>
          {canLoadOlder ? (
            <div className='flex justify-center'>
              <KangurButton
                onClick={onLoadOlder}
                variant='ghost'
                disabled={isLoadingOlder}
                aria-busy={isLoadingOlder}
              >
                {isLoadingOlder ? chatTranslations('loadingOlder') : chatTranslations('loadOlder')}
              </KangurButton>
            </div>
          ) : null}
          <ul className={KANGUR_STACK_SPACED_CLASSNAME} role='list'>
            {groupedMessages.map((entry) => (
              <DuelsLobbyChatMessageItem
                key={entry.message.id}
                chatTranslations={chatTranslations}
                commonTranslations={commonTranslations}
                entry={entry}
                relativeNow={relativeNow}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DuelsLobbyChatLoginPrompt(props: {
  chatTranslations: LobbyChatTranslations;
  compactActionClassName: string;
  onRequireLogin: () => void;
}): React.JSX.Element {
  const { chatTranslations, compactActionClassName, onRequireLogin } = props;

  return (
    <KangurInfoCard accent='slate' padding='md' tone='accent' role='status'>
      <KangurPanelRow className='sm:items-center sm:justify-between'>
        <span className='text-sm text-slate-700'>{chatTranslations('loginPrompt')}</span>
        <KangurButton
          onClick={onRequireLogin}
          variant='secondary'
          className={compactActionClassName}
        >
          {chatTranslations('loginButton')}
        </KangurButton>
      </KangurPanelRow>
    </KangurInfoCard>
  );
}

function DuelsLobbyChatComposer(props: DuelsLobbyChatComposerProps): React.JSX.Element {
  const {
    chatTranslations,
    enabled,
    canPost,
    isOnline,
    isSending,
    canSend,
    draft,
    maxMessageLength,
    remainingChars,
    nearLimit,
    compactActionClassName,
    onDraftChange,
    onDraftKeyDown,
    onSend,
  } = props;
  const placeholder = resolveChatPlaceholder({ enabled, canPost, chatTranslations });
  const remainingCharactersClassName = resolveRemainingCharactersClassName(
    remainingChars,
    nearLimit
  );

  return (
    <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
      <KangurPanelRow className='sm:items-center'>
        <KangurTextField
          value={draft}
          onChange={onDraftChange}
          placeholder={placeholder}
          aria-label={chatTranslations('messageAria')}
          disabled={!enabled || !canPost || !isOnline || isSending}
          maxLength={maxMessageLength}
          onKeyDown={onDraftKeyDown}
        />
        <KangurButton
          onClick={onSend}
          variant='primary'
          disabled={!canSend}
          aria-busy={isSending}
          className={compactActionClassName}
        >
          {isSending ? chatTranslations('sending') : chatTranslations('send')}
        </KangurButton>
      </KangurPanelRow>
      <div
        className={`${KANGUR_TIGHT_ROW_CLASSNAME} text-xs text-slate-500 sm:items-center sm:justify-between`}
      >
        <span className={remainingCharactersClassName}>
          {chatTranslations('remainingCharacters', { count: remainingChars })}
        </span>
        {canPost && !isOnline ? <span>{chatTranslations('offlineNotice')}</span> : null}
      </div>
    </div>
  );
}

export function DuelsLobbyChatPanel(props: DuelsLobbyChatPanelProps): React.JSX.Element {
  const chatTranslations = useTranslations('KangurDuels.chat');
  const commonTranslations = useTranslations('KangurDuels.common');
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    enabled,
    isOnline,
    isPageActive = true,
    canPost,
    relativeNow,
    activeLearnerId,
    onRequireLogin,
  } = props;
  const chatEnabled = resolveChatEnabled(enabled, isPageActive);
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
    enabled: chatEnabled,
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
  const canLoadOlder = resolveCanLoadOlder(nextCursor, isOnline);
  const canSend = resolveCanSend({
    chatEnabled,
    isOnline,
    canPost,
    isSending,
    draft,
    maxMessageLength,
  });
  const compactActionClassName = resolveCompactActionClassName(isCoarsePointer);

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
    if (!container) {
      return;
    }
    const scroll = () => {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: container.scrollHeight, behavior });
        return;
      }
      container.scrollTop = container.scrollHeight;
    };
    requestAnimationFrame(scroll);
  }, []);

  const groupedMessages = useMemo(
    () => groupLobbyMessages(messages, activeLearnerId),
    [messages, activeLearnerId]
  );

  const handleSend = useCallback(async (): Promise<void> => {
    if (!canPost) {
      onRequireLogin();
      return;
    }
    const trimmedDraft = trimChatDraft(draft);
    if (!trimmedDraft || !canSend) {
      return;
    }
    try {
      await sendMessage({ message: trimmedDraft });
      setDraft('');
    } catch (error) {
      void ErrorSystem.captureException(error);
    }
  }, [canPost, canSend, draft, onRequireLogin, sendMessage]);

  const handleLoadOlder = useCallback(async (): Promise<void> => {
    if (!canLoadOlder || isLoadingOlder) {
      return;
    }
    const container = scrollContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    await loadOlder();

    if (!container) {
      return;
    }
    requestAnimationFrame(() => {
      const nextScrollHeight = container.scrollHeight;
      const delta = nextScrollHeight - previousScrollHeight;
      container.scrollTop = previousScrollTop + delta;
    });
  }, [canLoadOlder, isLoadingOlder, loadOlder]);

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
      return;
    }

    const increment = nextCount - previousCount;
    setUnreadCount((current) => Math.min(LOBBY_CHAT_UNREAD_CAP, current + Math.max(1, increment)));
  }, [messages, resolveIsAtBottom, scrollToBottom]);

  const handleRefresh = useCallback((): void => {
    void refresh();
  }, [refresh]);

  const handleScrollToBottom = useCallback((): void => {
    scrollToBottom('smooth');
    setUnreadCount(0);
    setIsAtBottom(true);
  }, [scrollToBottom]);

  const handleLoadOlderClick = useCallback((): void => {
    void handleLoadOlder();
  }, [handleLoadOlder]);

  const handleDraftChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    setDraft(event.target.value);
  }, []);

  const handleDraftKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (!shouldSubmitChatDraftFromKeyDown(event)) {
        return;
      }
      event.preventDefault();
      void handleSend();
    },
    [handleSend]
  );

  const handleSendClick = useCallback((): void => {
    void handleSend();
  }, [handleSend]);

  return (
    <KangurGlassPanel
      className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
      padding='lg'
      surface='solid'
      role='region'
      aria-labelledby='kangur-lobby-chat-heading'
    >
      <DuelsLobbyChatHeader
        chatTranslations={chatTranslations}
        commonTranslations={commonTranslations}
        messagesCount={messages.length}
        unreadCount={unreadCount}
        isAtBottom={isAtBottom}
        isOnline={isOnline}
        isStreaming={isStreaming}
        lastUpdatedAt={lastUpdatedAt}
        relativeNow={relativeNow}
        isLoading={isLoading}
        compactActionClassName={compactActionClassName}
        onRefresh={handleRefresh}
        onScrollToBottom={handleScrollToBottom}
      />

      {error ? (
        <KangurInfoCard accent='rose' padding='md' tone='accent' role='alert' aria-live='assertive'>
          {error}
        </KangurInfoCard>
      ) : null}

      <DuelsLobbyChatMessages
        chatTranslations={chatTranslations}
        commonTranslations={commonTranslations}
        groupedMessages={groupedMessages}
        hasMessages={hasMessages}
        canLoadOlder={canLoadOlder}
        isLoading={isLoading}
        isLoadingOlder={isLoadingOlder}
        relativeNow={relativeNow}
        scrollContainerRef={scrollContainerRef}
        onLoadOlder={handleLoadOlderClick}
      />

      {!canPost ? (
        <DuelsLobbyChatLoginPrompt
          chatTranslations={chatTranslations}
          compactActionClassName={compactActionClassName}
          onRequireLogin={onRequireLogin}
        />
      ) : null}

      <DuelsLobbyChatComposer
        chatTranslations={chatTranslations}
        enabled={enabled}
        canPost={canPost}
        isOnline={isOnline}
        isSending={isSending}
        canSend={canSend}
        draft={draft}
        maxMessageLength={maxMessageLength}
        remainingChars={remainingChars}
        nearLimit={nearLimit}
        compactActionClassName={compactActionClassName}
        onDraftChange={handleDraftChange}
        onDraftKeyDown={handleDraftKeyDown}
        onSend={handleSendClick}
      />
    </KangurGlassPanel>
  );
}
