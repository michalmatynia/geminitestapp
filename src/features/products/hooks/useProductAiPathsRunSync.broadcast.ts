import { AI_PATH_RUN_QUEUE_CHANNEL } from '@/shared/contracts/ai-paths';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const openProductAiRunBroadcastChannel = (
  handlePayload: (payload: unknown) => void
): BroadcastChannel | null => {
  const BroadcastChannelCtor = window.BroadcastChannel;
  if (typeof BroadcastChannelCtor !== 'function') return null;
  try {
    const channel = new BroadcastChannelCtor(AI_PATH_RUN_QUEUE_CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>): void => {
      handlePayload(event.data);
    };
    return channel;
  } catch (error) {
    logClientError(error);
    return null;
  }
};
