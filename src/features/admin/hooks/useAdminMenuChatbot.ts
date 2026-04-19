import { useCallback } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { startTransition } from 'react';
import { useChatbotSessions, useCreateChatbotSession } from '@/features/ai/public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export interface AdminMenuChatbotResult {
  handleOpenChat: (event: React.MouseEvent<HTMLAnchorElement>) => void;
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

  const handleOpenChat = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>): void => {
      if (typeof window === 'undefined') return;
      const storedSession = window.localStorage.getItem('chatbotSessionId');
      if (storedSession !== null && storedSession !== '') {
        event.preventDefault();
        setPendingHref('/admin/chatbot');
        startTransition(() => { router.push(`/admin/chatbot?session=${storedSession}`); });
        return;
      }
      (async () => {
        try {
          const initialId: string | undefined = chatbotSessions[0]?.id;
          let latestId = initialId;
          if (latestId === undefined || latestId === '') {
            const sessionsResult = await refetchChatbotSessions();
            const fetchedId = sessionsResult.data?.[0]?.id;
            latestId = fetchedId;
          }
          if (latestId !== undefined && latestId !== '') {
            window.localStorage.setItem('chatbotSessionId', latestId);
            startTransition(() => { router.replace(`/admin/chatbot?session=${latestId}`); });
            return;
          }
          const created = await createChatbotSession({});
          if (created.sessionId !== '') {
            window.localStorage.setItem('chatbotSessionId', created.sessionId);
            startTransition(() => { router.replace(`/admin/chatbot?session=${created.sessionId}`); });
          }
        } catch (error) {
          logClientError(error);
        }
      })().catch(logClientError);
    },
    [router, chatbotSessions, createChatbotSession, refetchChatbotSessions, setPendingHref]
  );

  return { handleOpenChat };
}
