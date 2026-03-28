import { z } from 'zod';

import { dtoBaseSchema } from './base';

export const filemakerMailProviderSchema = z.enum(['imap_smtp']);
export type FilemakerMailProviderDto = z.infer<typeof filemakerMailProviderSchema>;
export type FilemakerMailProvider = FilemakerMailProviderDto;

export const filemakerMailAccountStatusSchema = z.enum(['active', 'paused']);
export type FilemakerMailAccountStatusDto = z.infer<typeof filemakerMailAccountStatusSchema>;
export type FilemakerMailAccountStatus = FilemakerMailAccountStatusDto;

export const filemakerMailFolderRoleSchema = z.enum([
  'inbox',
  'sent',
  'drafts',
  'trash',
  'archive',
  'spam',
  'custom',
]);
export type FilemakerMailFolderRoleDto = z.infer<typeof filemakerMailFolderRoleSchema>;
export type FilemakerMailFolderRole = FilemakerMailFolderRoleDto;

export const filemakerMailMessageDirectionSchema = z.enum(['inbound', 'outbound']);
export type FilemakerMailMessageDirectionDto = z.infer<
  typeof filemakerMailMessageDirectionSchema
>;
export type FilemakerMailMessageDirection = FilemakerMailMessageDirectionDto;

export const filemakerMailOutboxStatusSchema = z.enum(['queued', 'sent', 'failed']);
export type FilemakerMailOutboxStatusDto = z.infer<typeof filemakerMailOutboxStatusSchema>;
export type FilemakerMailOutboxStatus = FilemakerMailOutboxStatusDto;

export const filemakerMailParticipantSchema = z.object({
  name: z.string().nullable().optional(),
  address: z.string(),
});
export type FilemakerMailParticipantDto = z.infer<typeof filemakerMailParticipantSchema>;
export type FilemakerMailParticipant = FilemakerMailParticipantDto;

export const filemakerMailFlagsSchema = z.object({
  seen: z.boolean().default(false),
  answered: z.boolean().default(false),
  flagged: z.boolean().default(false),
  draft: z.boolean().default(false),
  deleted: z.boolean().default(false),
});
export type FilemakerMailFlagsDto = z.infer<typeof filemakerMailFlagsSchema>;
export type FilemakerMailFlags = FilemakerMailFlagsDto;

export const filemakerMailAttachmentSchema = z.object({
  id: z.string(),
  fileName: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
  contentId: z.string().nullable().optional(),
  disposition: z.string().nullable().optional(),
  isInline: z.boolean().default(false),
});
export type FilemakerMailAttachmentDto = z.infer<typeof filemakerMailAttachmentSchema>;
export type FilemakerMailAttachment = FilemakerMailAttachmentDto;

export const filemakerMailAccountSchema = dtoBaseSchema.extend({
  name: z.string(),
  emailAddress: z.string(),
  provider: filemakerMailProviderSchema.default('imap_smtp'),
  status: filemakerMailAccountStatusSchema.default('active'),
  imapHost: z.string(),
  imapPort: z.number().int().positive(),
  imapSecure: z.boolean().default(true),
  imapUser: z.string(),
  imapPasswordSettingKey: z.string(),
  smtpHost: z.string(),
  smtpPort: z.number().int().positive(),
  smtpSecure: z.boolean().default(true),
  smtpUser: z.string(),
  smtpPasswordSettingKey: z.string(),
  fromName: z.string().nullable().optional(),
  replyToEmail: z.string().nullable().optional(),
  folderAllowlist: z.array(z.string()).default([]),
  initialSyncLookbackDays: z.number().int().positive().max(365).default(30),
  maxMessagesPerSync: z.number().int().positive().max(500).default(100),
  lastSyncedAt: z.string().nullable().optional(),
  lastSyncError: z.string().nullable().optional(),
});
export type FilemakerMailAccountDto = z.infer<typeof filemakerMailAccountSchema>;
export type FilemakerMailAccount = FilemakerMailAccountDto;

export const filemakerMailFolderSyncStateSchema = dtoBaseSchema.extend({
  accountId: z.string(),
  mailboxPath: z.string(),
  role: filemakerMailFolderRoleSchema.default('custom'),
  uidValidity: z.string().nullable().optional(),
  lastUid: z.number().int().nonnegative().default(0),
  lastSyncedAt: z.string().nullable().optional(),
});
export type FilemakerMailFolderSyncStateDto = z.infer<
  typeof filemakerMailFolderSyncStateSchema
>;
export type FilemakerMailFolderSyncState = FilemakerMailFolderSyncStateDto;

export const filemakerMailFolderSummarySchema = z.object({
  id: z.string(),
  accountId: z.string(),
  mailboxPath: z.string(),
  mailboxRole: filemakerMailFolderRoleSchema.default('custom'),
  threadCount: z.number().int().nonnegative().default(0),
  unreadCount: z.number().int().nonnegative().default(0),
  lastMessageAt: z.string().nullable().optional(),
});
export type FilemakerMailFolderSummaryDto = z.infer<typeof filemakerMailFolderSummarySchema>;
export type FilemakerMailFolderSummary = FilemakerMailFolderSummaryDto;

export const filemakerMailThreadSchema = dtoBaseSchema.extend({
  accountId: z.string(),
  mailboxPath: z.string(),
  mailboxRole: filemakerMailFolderRoleSchema.default('custom'),
  providerThreadId: z.string().nullable().optional(),
  subject: z.string(),
  normalizedSubject: z.string(),
  snippet: z.string().nullable().optional(),
  participantSummary: z.array(filemakerMailParticipantSchema),
  relatedPersonIds: z.array(z.string()).default([]),
  relatedOrganizationIds: z.array(z.string()).default([]),
  unreadCount: z.number().int().nonnegative().default(0),
  messageCount: z.number().int().nonnegative().default(0),
  lastMessageAt: z.string(),
});
export type FilemakerMailThreadDto = z.infer<typeof filemakerMailThreadSchema>;
export type FilemakerMailThread = FilemakerMailThreadDto;

export const filemakerMailMessageSchema = dtoBaseSchema.extend({
  accountId: z.string(),
  threadId: z.string(),
  mailboxPath: z.string(),
  mailboxRole: filemakerMailFolderRoleSchema.default('custom'),
  providerMessageId: z.string().nullable().optional(),
  providerThreadId: z.string().nullable().optional(),
  providerUid: z.number().int().nonnegative().nullable().optional(),
  direction: filemakerMailMessageDirectionSchema,
  subject: z.string(),
  snippet: z.string().nullable().optional(),
  from: filemakerMailParticipantSchema.nullable().optional(),
  to: z.array(filemakerMailParticipantSchema).default([]),
  cc: z.array(filemakerMailParticipantSchema).default([]),
  bcc: z.array(filemakerMailParticipantSchema).default([]),
  replyTo: z.array(filemakerMailParticipantSchema).default([]),
  sentAt: z.string().nullable().optional(),
  receivedAt: z.string().nullable().optional(),
  flags: filemakerMailFlagsSchema.default({
    seen: false,
    answered: false,
    flagged: false,
    draft: false,
    deleted: false,
  }),
  textBody: z.string().nullable().optional(),
  htmlBody: z.string().nullable().optional(),
  inReplyTo: z.string().nullable().optional(),
  references: z.array(z.string()).default([]),
  attachments: z.array(filemakerMailAttachmentSchema).default([]),
  relatedPersonIds: z.array(z.string()).default([]),
  relatedOrganizationIds: z.array(z.string()).default([]),
});
export type FilemakerMailMessageDto = z.infer<typeof filemakerMailMessageSchema>;
export type FilemakerMailMessage = FilemakerMailMessageDto;

export const filemakerMailOutboxEntrySchema = dtoBaseSchema.extend({
  accountId: z.string(),
  threadId: z.string().nullable().optional(),
  inReplyTo: z.string().nullable().optional(),
  to: z.array(filemakerMailParticipantSchema).default([]),
  cc: z.array(filemakerMailParticipantSchema).default([]),
  bcc: z.array(filemakerMailParticipantSchema).default([]),
  subject: z.string(),
  bodyHtml: z.string(),
  bodyText: z.string(),
  status: filemakerMailOutboxStatusSchema.default('queued'),
  providerMessageId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
});
export type FilemakerMailOutboxEntryDto = z.infer<typeof filemakerMailOutboxEntrySchema>;
export type FilemakerMailOutboxEntry = FilemakerMailOutboxEntryDto;

export const filemakerMailComposeInputSchema = z.object({
  accountId: z.string(),
  threadId: z.string().nullable().optional(),
  inReplyTo: z.string().nullable().optional(),
  to: z.array(filemakerMailParticipantSchema).min(1),
  cc: z.array(filemakerMailParticipantSchema).default([]),
  bcc: z.array(filemakerMailParticipantSchema).default([]),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
});
export type FilemakerMailComposeInputDto = z.infer<typeof filemakerMailComposeInputSchema>;
export type FilemakerMailComposeInput = FilemakerMailComposeInputDto;

export const filemakerMailAccountDraftSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  emailAddress: z.string().min(1),
  status: filemakerMailAccountStatusSchema.default('active'),
  imapHost: z.string().min(1),
  imapPort: z.number().int().positive(),
  imapSecure: z.boolean().default(true),
  imapUser: z.string().min(1),
  imapPassword: z.string(),
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().positive(),
  smtpSecure: z.boolean().default(true),
  smtpUser: z.string().min(1),
  smtpPassword: z.string(),
  fromName: z.string().nullable().optional(),
  replyToEmail: z.string().nullable().optional(),
  folderAllowlist: z.array(z.string()).default([]),
  initialSyncLookbackDays: z.number().int().positive().max(365).default(30),
  maxMessagesPerSync: z.number().int().positive().max(500).default(100),
});
export type FilemakerMailAccountDraftDto = z.infer<typeof filemakerMailAccountDraftSchema>;
export type FilemakerMailAccountDraft = FilemakerMailAccountDraftDto;

export const filemakerMailThreadDetailSchema = z.object({
  thread: filemakerMailThreadSchema,
  messages: z.array(filemakerMailMessageSchema),
});
export type FilemakerMailThreadDetailDto = z.infer<typeof filemakerMailThreadDetailSchema>;
export type FilemakerMailThreadDetail = FilemakerMailThreadDetailDto;

export const filemakerMailSyncResultSchema = z.object({
  accountId: z.string(),
  foldersScanned: z.array(z.string()),
  fetchedMessageCount: z.number().int().nonnegative(),
  insertedMessageCount: z.number().int().nonnegative(),
  updatedMessageCount: z.number().int().nonnegative(),
  touchedThreadCount: z.number().int().nonnegative(),
  completedAt: z.string(),
});
export type FilemakerMailSyncResultDto = z.infer<typeof filemakerMailSyncResultSchema>;
export type FilemakerMailSyncResult = FilemakerMailSyncResultDto;
