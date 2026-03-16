import { z } from 'zod';

const nonEmptyTrimmedString = z.string().trim().min(1);

export const KANGUR_DUELS_LOBBY_CHAT_LOBBY_ID = 'duels_lobby';
export const KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT = 40;
export const KANGUR_DUELS_LOBBY_CHAT_MAX_LIMIT = 120;
export const KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH = 280;
export const KANGUR_DUELS_LOBBY_CHAT_RETENTION_HOURS = 24;

export const kangurDuelLobbyChatMessageSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  lobbyId: nonEmptyTrimmedString.max(120),
  senderId: nonEmptyTrimmedString.max(120),
  senderName: nonEmptyTrimmedString.max(120),
  senderAvatarId: z.string().trim().min(1).max(120).nullable().optional(),
  message: z.string().trim().min(1).max(KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH),
  createdAt: z.string().datetime({ offset: true }),
});

export type KangurDuelLobbyChatMessage = z.infer<typeof kangurDuelLobbyChatMessageSchema>;

export const kangurDuelLobbyChatListResponseSchema = z.object({
  messages: z.array(kangurDuelLobbyChatMessageSchema),
  serverTime: z.string().datetime({ offset: true }),
  nextCursor: z.string().datetime({ offset: true }).nullable().optional(),
});

export type KangurDuelLobbyChatListResponse = z.infer<
  typeof kangurDuelLobbyChatListResponseSchema
>;

export const kangurDuelLobbyChatCreateInputSchema = z.object({
  message: z.string().trim().min(1).max(KANGUR_DUELS_LOBBY_CHAT_MAX_MESSAGE_LENGTH),
});

export type KangurDuelLobbyChatCreateInput = z.infer<
  typeof kangurDuelLobbyChatCreateInputSchema
>;

export const kangurDuelLobbyChatSendResponseSchema = z.object({
  message: kangurDuelLobbyChatMessageSchema,
  serverTime: z.string().datetime({ offset: true }),
});

export type KangurDuelLobbyChatSendResponse = z.infer<
  typeof kangurDuelLobbyChatSendResponseSchema
>;
