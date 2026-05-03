import { useRouter } from 'nextjs-toploader/app';
import { startTransition } from 'react';
import { useCallback } from 'react';

import { useChatbotSessions, useCreateChatbotSession } from '@/features/ai/public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export interface AdminMenuChatbotResult {
  handleOpenChat: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

type RouterLike = ReturnType<typeof useRouter>;
type ChatbotSessionSummary = { id?: string };
type RefetchSessions = () => Promise<{ data?: ChatbotSessionSummary[] }>;
type CreateSession = () => Promise<{ sessionId: string }>;

const ADMIN_CHATBOT_PATH = '/admin/chatbot';
const CHATBOT_SESSION_STORAGE_KEY = 'chatbotSessionId';

function hasSessionId(value: string | null | undefined): value is string {
  return value !== undefined && value !== null && value !== '';
}

function buildChatbotUrl(sessionId: string): string {
  return `${ADMIN_CHATBOT_PATH}?session=${sessionId}`;
}

function navigateToChatbot(
  router: RouterLike,
  sessionId: string,
  navigationMode: 'push' | 'replace'
): void {
  window.localStorage.setItem(CHATBOT_SESSION_STORAGE_KEY, sessionId);
  const chatbotUrl = buildChatbotUrl(sessionId);

  startTransition(() => {
    if (navigationMode === 'replace') {
      router.replace(chatbotUrl);
      return;
    }

    router.push(chatbotUrl);
  });
}

async function resolveChatbotSessionId(
  chatbotSessions: ChatbotSessionSummary[],
  refetchChatbotSessions: RefetchSessions,
  createChatbotSession: CreateSession
): Promise<string | null> {
  const initialId = chatbotSessions[0]?.id;
  if (hasSessionId(initialId)) {
    return initialId;
  }

  const refetchedId = (await refetchChatbotSessions()).data?.[0]?.id;
  if (hasSessionId(refetchedId)) {
    return refetchedId;
  }

  const createdSession = await createChatbotSession();
  return hasSessionId(createdSession.sessionId) ? createdSession.sessionId : null;
}

export function useAdminMenuChatbot(
  shouldPrefetch: boolean,
  setPendingHref: (href: string | null) => void
): AdminMenuChatbotResult {
  const router = useRouter();
  const { data: chatbotSessions = [], refetch: refetchChatbotSessions } = useChatbotSessions({
    enabled: shouldPrefetch,
  });
  const { mutateAsync: createChatbotSession } = useCreateChatbotSession();

  const openResolvedSession = useCallback((): Promise<void> => {
    return resolveChatbotSessionId(
      chatbotSessions,
      refetchChatbotSessions,
      () => createChatbotSession({})
    ).then((sessionId) => {
      if (sessionId === null) {
        return;
      }

      navigateToChatbot(router, sessionId, 'replace');
    });
  }, [chatbotSessions, createChatbotSession, refetchChatbotSessions, router]);

  const handleOpenChat = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>): void => {
      if (typeof window === 'undefined') {
        return;
      }

      const storedSession = window.localStorage.getItem(CHATBOT_SESSION_STORAGE_KEY);
      if (hasSessionId(storedSession)) {
        event.preventDefault();
        setPendingHref(ADMIN_CHATBOT_PATH);
        navigateToChatbot(router, storedSession, 'push');
        return;
      }

      openResolvedSession().catch(logClientError);
    },
    [openResolvedSession, router, setPendingHref]
  );

  return { handleOpenChat };
}
