import 'server-only';

import {
  createKangurDuelSession as createSession,
  joinKangurDuelSession as joinSession,
  submitKangurDuelAnswer as submitAnswer,
  getKangurDuelState as getState,
  heartbeatKangurDuelSession as heartbeat,
  listKangurDuelLobby as listLobby,
  listKangurPublicDuelLobby as listPublicLobby,
  listKangurDuelOpponents as listOpponents,
  searchKangurDuelLearners as searchLearners,
  leaveKangurDuelSession as leaveSession,
  sendKangurDuelReaction as sendReaction,
  getKangurDuelSpectatorState as getSpectatorState,
  listKangurDuelLeaderboard as listLeaderboard,
} from './server.db';

export const createKangurDuelSession = createSession;
export const joinKangurDuelSession = joinSession;
export const submitKangurDuelAnswer = submitAnswer;
export const getKangurDuelState = getState;
export const heartbeatKangurDuelSession = heartbeat;
export const listKangurDuelLobby = listLobby;
export const listKangurPublicDuelLobby = listPublicLobby;
export const listKangurDuelOpponents = listOpponents;
export const searchKangurDuelLearners = searchLearners;
export const leaveKangurDuelSession = leaveSession;
export const sendKangurDuelReaction = sendReaction;
export const getKangurDuelSpectatorState = getSpectatorState;
export const listKangurDuelLeaderboard = listLeaderboard;
