import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY } from '../settings-constants';
import {
  createFilemakerEmailCampaignEvent,
  parseFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
} from '../settings/campaign-factories';
import type { FilemakerMailCampaignContext, FilemakerMailMessage } from '../types';

import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './campaign-settings-store';
import { appendEventsToRegistry } from './campaign-runtime.helpers';
import * as mailStorage from './mail/mail-storage';

const LOG_SOURCE = 'filemaker-campaign-reply-detector';

export const detectFilemakerCampaignReplyContext = async (input: {
  accountId: string;
  references: string[];
}): Promise<FilemakerMailCampaignContext | null> => {
  const references = input.references
    .map((entry) => entry.trim())
    .filter((entry): entry is string => entry.length > 0);
  if (references.length === 0) return null;
  const messages = await mailStorage.findMailMessagesByProviderIds(input.accountId, references);
  const matched = messages.find(
    (message) =>
      message.direction === 'outbound' &&
      typeof message.campaignContext?.campaignId === 'string' &&
      message.campaignContext.campaignId.length > 0
  );
  return matched?.campaignContext ?? null;
};

export const recordFilemakerCampaignReply = async (input: {
  campaignContext: FilemakerMailCampaignContext;
  replyMessage: FilemakerMailMessage;
}): Promise<void> => {
  try {
    const raw = await readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);
    const registry = parseFilemakerEmailCampaignEventRegistry(raw);
    const replyEvent = createFilemakerEmailCampaignEvent({
      campaignId: input.campaignContext.campaignId,
      runId: input.campaignContext.runId ?? null,
      deliveryId: input.campaignContext.deliveryId ?? null,
      type: 'reply_received',
      message: `Reply received from ${input.replyMessage.from?.address ?? 'unknown'}`,
      actor: input.replyMessage.from?.address ?? null,
      mailThreadId: input.replyMessage.threadId,
      mailMessageId: input.replyMessage.id,
    });
    const next = appendEventsToRegistry(registry, [replyEvent]);
    await upsertFilemakerCampaignSettingValue(
      FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
      JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(next))
    );
  } catch (error) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `Failed to record campaign reply for ${input.campaignContext.campaignId}`,
      error,
    }).catch(() => {});
  }
};
