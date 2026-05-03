import type {
  FilemakerEmail,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
} from '../../types';

export type OrganizationCampaignDeliveryViewMode = 'by_email' | 'by_campaign';

export interface OrganizationCampaignDeliveryGroup<TKeyEntity> {
  key: string;
  entity: TKeyEntity;
  deliveries: FilemakerEmailCampaignDelivery[];
}

export type OrganizationCampaignDeliveryActiveGroup = OrganizationCampaignDeliveryGroup<
  FilemakerEmail | FilemakerEmailCampaign | null
>;
