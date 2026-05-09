import { type LiveScripterServerMessage } from '@/shared/contracts/playwright-live-scripter';
import { type LiveScripterSocket } from './types';

const isSocketOpen = (socket: LiveScripterSocket): boolean => socket.readyState === 1;

export const sendSocketMessage = (
  socket: LiveScripterSocket,
  message: LiveScripterServerMessage
): void => {
  if (!isSocketOpen(socket)) {
    return;
  }
  socket.send(JSON.stringify(message));
};

export const broadcastToSockets = (sockets: Set<LiveScripterSocket>, message: LiveScripterServerMessage): void => {
  for (const socket of sockets) {
    sendSocketMessage(socket, message);
  }
};
