import type {
  resolveFilemakerCampaignContentForRecipient,
  toFilemakerCampaignContentDeliveryMetadata,
} from '../../settings';
import type { FilemakerEmailCampaignDelivery } from '../../types';
import type {
  RuntimeDeliveryContext,
  RuntimeProcessState,
} from './runtime-process-types';

export type DeliveryAttemptContext = {
  attemptNumber: number;
  content: ReturnType<typeof resolveFilemakerCampaignContentForRecipient>;
  contentMetadata: ReturnType<typeof toFilemakerCampaignContentDeliveryMetadata>;
  html: string | null;
  text: string;
};

export type DeliveryHandlerInput = {
  attempt: DeliveryAttemptContext;
  context: RuntimeDeliveryContext;
  delivery: FilemakerEmailCampaignDelivery;
  state: RuntimeProcessState;
};

export const replaceDeliveryInCollection = (
  deliveries: FilemakerEmailCampaignDelivery[],
  nextDelivery: FilemakerEmailCampaignDelivery
): FilemakerEmailCampaignDelivery[] =>
  deliveries.map((delivery) => (delivery.id === nextDelivery.id ? nextDelivery : delivery));
