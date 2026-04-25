import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Filemaker Contracts
 */

export const filemakerPartyKindSchema = z.enum(['person', 'organization']);
export type FilemakerPartyKindDto = z.infer<typeof filemakerPartyKindSchema>;
export type FilemakerPartyKind = FilemakerPartyKindDto;

export const filemakerEntityKindSchema = z.enum([
  'person',
  'organization',
  'event',
  'address',
  'address_link',
  'database',
  'phone_number',
  'phone_number_link',
  'email',
  'email_link',
  'event_organization_link',
  'value',
  'value_parameter',
  'value_parameter_link',
  'organization_legacy_demand',
  'email_campaign',
  'email_campaign_run',
  'email_campaign_delivery',
  'email_campaign_delivery_attempt',
  'email_campaign_event',
  'email_campaign_suppression',
]);
export type FilemakerEntityKindDto = z.infer<typeof filemakerEntityKindSchema>;
export type FilemakerEntityKind = FilemakerEntityKindDto;

export const filemakerPartyReferenceSchema = z.object({
  id: z.string(),
  kind: filemakerPartyKindSchema,
  name: z.string().optional(),
});

export type FilemakerPartyReferenceDto = z.infer<typeof filemakerPartyReferenceSchema>;
export type FilemakerPartyReference = FilemakerPartyReferenceDto;

export const filemakerAddressSchema = dtoBaseSchema.extend({
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
});

export type FilemakerAddressDto = z.infer<typeof filemakerAddressSchema>;
export type FilemakerAddress = FilemakerAddressDto;

export const filemakerAddressOwnerKindSchema = z.enum(['person', 'organization', 'event']);
export type FilemakerAddressOwnerKindDto = z.infer<typeof filemakerAddressOwnerKindSchema>;
export type FilemakerAddressOwnerKind = FilemakerAddressOwnerKindDto;

export const filemakerAddressLinkSchema = dtoBaseSchema.extend({
  ownerKind: filemakerAddressOwnerKindSchema,
  ownerId: z.string(),
  addressId: z.string(),
  isDefault: z.boolean(),
});

export type FilemakerAddressLinkDto = z.infer<typeof filemakerAddressLinkSchema>;
export type FilemakerAddressLink = FilemakerAddressLinkDto;

export const filemakerPersonSchema = dtoBaseSchema.extend({
  firstName: z.string(),
  lastName: z.string(),
  addressId: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
  nip: z.string(),
  regon: z.string(),
  phoneNumbers: z.array(z.string()),
});

export type FilemakerPersonDto = z.infer<typeof filemakerPersonSchema>;
export type FilemakerPerson = FilemakerPersonDto;

export const filemakerOrganizationSchema = dtoBaseSchema.extend({
  name: z.string(),
  addressId: z.string(),
  displayAddressId: z.string().nullable().optional(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
  taxId: z.string().optional(),
  krs: z.string().optional(),
  tradingName: z.string().optional(),
  cooperationStatus: z.string().optional(),
  establishedDate: z.string().nullable().optional(),
  parentOrganizationId: z.string().nullable().optional(),
  defaultBankAccountId: z.string().nullable().optional(),
  displayBankAccountId: z.string().nullable().optional(),
  legacyUuid: z.string().optional(),
  legacyParentUuid: z.string().optional(),
  legacyDefaultAddressUuid: z.string().optional(),
  legacyDisplayAddressUuid: z.string().optional(),
  legacyDefaultBankAccountUuid: z.string().optional(),
  legacyDisplayBankAccountUuid: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type FilemakerOrganizationDto = z.infer<typeof filemakerOrganizationSchema>;
export type FilemakerOrganization = FilemakerOrganizationDto;

export const filemakerEventSchema = dtoBaseSchema.extend({
  eventName: z.string(),
  addressId: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
});

export type FilemakerEventDto = z.infer<typeof filemakerEventSchema>;
export type FilemakerEvent = FilemakerEventDto;

export const filemakerEmailStatusSchema = z.enum(['active', 'inactive', 'bounced', 'unverified']);
export type FilemakerEmailStatusDto = z.infer<typeof filemakerEmailStatusSchema>;
export type FilemakerEmailStatus = FilemakerEmailStatusDto;

export const filemakerPhoneNumberSchema = dtoBaseSchema.extend({
  phoneNumber: z.string(),
});

export type FilemakerPhoneNumberDto = z.infer<typeof filemakerPhoneNumberSchema>;
export type FilemakerPhoneNumber = FilemakerPhoneNumberDto;

export const filemakerPhoneNumberLinkSchema = dtoBaseSchema.extend({
  phoneNumberId: z.string(),
  partyKind: filemakerPartyKindSchema,
  partyId: z.string(),
});

export type FilemakerPhoneNumberLinkDto = z.infer<typeof filemakerPhoneNumberLinkSchema>;
export type FilemakerPhoneNumberLink = FilemakerPhoneNumberLinkDto;

export const filemakerEmailSchema = dtoBaseSchema.extend({
  email: z.string(),
  status: filemakerEmailStatusSchema,
});

export type FilemakerEmailDto = z.infer<typeof filemakerEmailSchema>;
export type FilemakerEmail = FilemakerEmailDto;

export const filemakerEmailLinkSchema = dtoBaseSchema.extend({
  emailId: z.string(),
  partyKind: filemakerPartyKindSchema,
  partyId: z.string(),
});

export type FilemakerEmailLinkDto = z.infer<typeof filemakerEmailLinkSchema>;
export type FilemakerEmailLink = FilemakerEmailLinkDto;

export const filemakerEventOrganizationLinkSchema = dtoBaseSchema.extend({
  eventId: z.string(),
  organizationId: z.string(),
});

export type FilemakerEventOrganizationLinkDto = z.infer<
  typeof filemakerEventOrganizationLinkSchema
>;
export type FilemakerEventOrganizationLink = FilemakerEventOrganizationLinkDto;

export const filemakerValueSchema = dtoBaseSchema.extend({
  parentId: z.string().nullable().optional(),
  label: z.string(),
  value: z.string(),
  description: z.string().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
  legacyUuid: z.string().optional(),
  legacyParentUuids: z.array(z.string()).optional(),
  legacyListUuids: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type FilemakerValueDto = z.infer<typeof filemakerValueSchema>;
export type FilemakerValue = FilemakerValueDto;

export const filemakerValueParameterSchema = dtoBaseSchema.extend({
  label: z.string(),
  description: z.string().optional(),
  legacyUuid: z.string().optional(),
});

export type FilemakerValueParameterDto = z.infer<typeof filemakerValueParameterSchema>;
export type FilemakerValueParameter = FilemakerValueParameterDto;

export const filemakerValueParameterLinkSchema = dtoBaseSchema.extend({
  valueId: z.string(),
  parameterId: z.string(),
  legacyValueUuid: z.string().optional(),
  legacyParameterUuid: z.string().optional(),
});

export type FilemakerValueParameterLinkDto = z.infer<
  typeof filemakerValueParameterLinkSchema
>;
export type FilemakerValueParameterLink = FilemakerValueParameterLinkDto;

export const filemakerOrganizationLegacyDemandSchema = dtoBaseSchema.extend({
  organizationId: z.string(),
  valueIds: z.array(z.string()).max(4).default([]),
  legacyUuid: z.string().optional(),
});

export type FilemakerOrganizationLegacyDemandDto = z.infer<
  typeof filemakerOrganizationLegacyDemandSchema
>;
export type FilemakerOrganizationLegacyDemand = FilemakerOrganizationLegacyDemandDto;

export const filemakerEmailCampaignLifecycleStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'archived',
]);
export type FilemakerEmailCampaignLifecycleStatusDto = z.infer<
  typeof filemakerEmailCampaignLifecycleStatusSchema
>;
export type FilemakerEmailCampaignLifecycleStatus =
  FilemakerEmailCampaignLifecycleStatusDto;

export const filemakerEmailCampaignLaunchModeSchema = z.enum([
  'manual',
  'scheduled',
  'recurring',
]);
export type FilemakerEmailCampaignLaunchModeDto = z.infer<
  typeof filemakerEmailCampaignLaunchModeSchema
>;
export type FilemakerEmailCampaignLaunchMode = FilemakerEmailCampaignLaunchModeDto;

export const filemakerEmailCampaignRunModeSchema = z.enum(['live', 'dry_run']);
export type FilemakerEmailCampaignRunModeDto = z.infer<
  typeof filemakerEmailCampaignRunModeSchema
>;
export type FilemakerEmailCampaignRunMode = FilemakerEmailCampaignRunModeDto;

export const filemakerEmailCampaignRunStatusSchema = z.enum([
  'pending',
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);
export type FilemakerEmailCampaignRunStatusDto = z.infer<
  typeof filemakerEmailCampaignRunStatusSchema
>;
export type FilemakerEmailCampaignRunStatus = FilemakerEmailCampaignRunStatusDto;

export const filemakerEmailCampaignDeliveryStatusSchema = z.enum([
  'queued',
  'sent',
  'failed',
  'skipped',
  'bounced',
]);
export type FilemakerEmailCampaignDeliveryStatusDto = z.infer<
  typeof filemakerEmailCampaignDeliveryStatusSchema
>;
export type FilemakerEmailCampaignDeliveryStatus =
  FilemakerEmailCampaignDeliveryStatusDto;

export const filemakerEmailCampaignDeliveryProviderSchema = z.enum(['webhook', 'smtp']);
export type FilemakerEmailCampaignDeliveryProviderDto = z.infer<
  typeof filemakerEmailCampaignDeliveryProviderSchema
>;
export type FilemakerEmailCampaignDeliveryProvider =
  FilemakerEmailCampaignDeliveryProviderDto;

export const filemakerEmailCampaignDeliveryFailureCategorySchema = z.enum([
  'soft_bounce',
  'hard_bounce',
  'provider_rejected',
  'rate_limited',
  'timeout',
  'invalid_recipient',
  'unknown',
]);
export type FilemakerEmailCampaignDeliveryFailureCategoryDto = z.infer<
  typeof filemakerEmailCampaignDeliveryFailureCategorySchema
>;
export type FilemakerEmailCampaignDeliveryFailureCategory =
  FilemakerEmailCampaignDeliveryFailureCategoryDto;

export const filemakerEmailCampaignDeliveryAttemptStatusSchema = z.enum([
  'sent',
  'failed',
  'bounced',
]);
export type FilemakerEmailCampaignDeliveryAttemptStatusDto = z.infer<
  typeof filemakerEmailCampaignDeliveryAttemptStatusSchema
>;
export type FilemakerEmailCampaignDeliveryAttemptStatus =
  FilemakerEmailCampaignDeliveryAttemptStatusDto;

export const filemakerEmailCampaignSuppressionReasonSchema = z.enum([
  'manual_block',
  'unsubscribed',
  'bounced',
  'complaint',
  'cold',
]);
export type FilemakerEmailCampaignSuppressionReasonDto = z.infer<
  typeof filemakerEmailCampaignSuppressionReasonSchema
>;
export type FilemakerEmailCampaignSuppressionReason =
  FilemakerEmailCampaignSuppressionReasonDto;

export const filemakerEmailCampaignEventTypeSchema = z.enum([
  'created',
  'updated',
  'unsubscribed',
  'resubscribed',
  'opened',
  'clicked',
  'launched',
  'processing_started',
  'delivery_sent',
  'delivery_failed',
  'delivery_bounced',
  'status_changed',
  'paused',
  'completed',
  'failed',
  'cancelled',
  'reply_received',
]);
export type FilemakerEmailCampaignEventTypeDto = z.infer<
  typeof filemakerEmailCampaignEventTypeSchema
>;
export type FilemakerEmailCampaignEventType = FilemakerEmailCampaignEventTypeDto;

export const filemakerAudienceFieldSchema = z.enum([
  'organization.name',
  'organization.tradingName',
  'organization.taxId',
  'organization.krs',
  'organization.city',
  'organization.country',
  'organization.postalCode',
  'organization.street',
  'person.firstName',
  'person.lastName',
  'person.city',
  'person.country',
  'person.postalCode',
  'person.street',
  'person.nip',
  'person.regon',
  'person.phoneNumbers',
  'email.address',
  'email.status',
  'organizationId',
  'eventId',
]);
export type FilemakerAudienceFieldDto = z.infer<typeof filemakerAudienceFieldSchema>;
export type FilemakerAudienceField = FilemakerAudienceFieldDto;

export const filemakerAudienceOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
]);
export type FilemakerAudienceOperatorDto = z.infer<typeof filemakerAudienceOperatorSchema>;
export type FilemakerAudienceOperator = FilemakerAudienceOperatorDto;

export const filemakerAudienceConditionSchema = z.object({
  id: z.string(),
  type: z.literal('condition').default('condition'),
  field: filemakerAudienceFieldSchema,
  operator: filemakerAudienceOperatorSchema,
  value: z.string().default(''),
});
export type FilemakerAudienceConditionDto = z.infer<typeof filemakerAudienceConditionSchema>;
export type FilemakerAudienceCondition = FilemakerAudienceConditionDto;

export type FilemakerAudienceConditionGroup = {
  id: string;
  type: 'group';
  combinator: 'and' | 'or';
  children: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup>;
};

export const filemakerAudienceConditionGroupSchema: z.ZodType<FilemakerAudienceConditionGroup> =
  z.lazy(() =>
    z.object({
      id: z.string(),
      type: z.literal('group'),
      combinator: z.enum(['and', 'or']),
      children: z.array(
        z.union([filemakerAudienceConditionSchema, filemakerAudienceConditionGroupSchema])
      ),
    })
  );
export type FilemakerAudienceConditionGroupDto = FilemakerAudienceConditionGroup;

export const filemakerEmailCampaignAudienceRuleSchema = z.object({
  partyKinds: z.array(filemakerPartyKindSchema),
  emailStatuses: z.array(filemakerEmailStatusSchema),
  includePartyReferences: z.array(filemakerPartyReferenceSchema),
  excludePartyReferences: z.array(filemakerPartyReferenceSchema),
  conditionGroup: filemakerAudienceConditionGroupSchema,
  // Legacy fields — retained for back-compat; the normalizer folds them into conditionGroup on read.
  organizationIds: z.array(z.string()).default([]),
  eventIds: z.array(z.string()).default([]),
  countries: z.array(z.string()).default([]),
  cities: z.array(z.string()).default([]),
  dedupeByEmail: z.boolean(),
  limit: z.number().int().positive().nullable().optional(),
});
export type FilemakerEmailCampaignAudienceRuleDto = z.infer<
  typeof filemakerEmailCampaignAudienceRuleSchema
>;
export type FilemakerEmailCampaignAudienceRule = FilemakerEmailCampaignAudienceRuleDto;

export const filemakerEmailCampaignRecurringRuleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().positive(),
  weekdays: z.array(z.number().int().min(0).max(6)),
  hourStart: z.number().int().min(0).max(23).nullable().optional(),
  hourEnd: z.number().int().min(0).max(23).nullable().optional(),
});
export type FilemakerEmailCampaignRecurringRuleDto = z.infer<
  typeof filemakerEmailCampaignRecurringRuleSchema
>;
export type FilemakerEmailCampaignRecurringRule =
  FilemakerEmailCampaignRecurringRuleDto;

export const filemakerEmailCampaignLaunchRuleSchema = z.object({
  mode: filemakerEmailCampaignLaunchModeSchema,
  scheduledAt: z.string().nullable().optional(),
  recurring: filemakerEmailCampaignRecurringRuleSchema.nullable().optional(),
  minAudienceSize: z.number().int().nonnegative(),
  requireApproval: z.boolean(),
  onlyWeekdays: z.boolean(),
  allowedHourStart: z.number().int().min(0).max(23).nullable().optional(),
  allowedHourEnd: z.number().int().min(0).max(23).nullable().optional(),
  pauseOnBounceRatePercent: z.number().min(0).max(100).nullable().optional(),
  timezone: z.string().nullable().optional(),
});
export type FilemakerEmailCampaignLaunchRuleDto = z.infer<
  typeof filemakerEmailCampaignLaunchRuleSchema
>;
export type FilemakerEmailCampaignLaunchRule = FilemakerEmailCampaignLaunchRuleDto;

export const filemakerEmailCampaignSchema = dtoBaseSchema.extend({
  name: z.string(),
  description: z.string().nullable().optional(),
  status: filemakerEmailCampaignLifecycleStatusSchema,
  subject: z.string(),
  previewText: z.string().nullable().optional(),
  mailAccountId: z.string().nullable().optional(),
  fromName: z.string().nullable().optional(),
  replyToEmail: z.string().nullable().optional(),
  bodyText: z.string().nullable().optional(),
  bodyHtml: z.string().nullable().optional(),
  audience: filemakerEmailCampaignAudienceRuleSchema,
  launch: filemakerEmailCampaignLaunchRuleSchema,
  approvalGrantedAt: z.string().nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  lastLaunchedAt: z.string().nullable().optional(),
  lastEvaluatedAt: z.string().nullable().optional(),
});
export type FilemakerEmailCampaignDto = z.infer<typeof filemakerEmailCampaignSchema>;
export type FilemakerEmailCampaign = FilemakerEmailCampaignDto;

export const filemakerEmailCampaignRunSchema = dtoBaseSchema.extend({
  campaignId: z.string(),
  mode: filemakerEmailCampaignRunModeSchema,
  status: filemakerEmailCampaignRunStatusSchema,
  launchReason: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  recipientCount: z.number().int().nonnegative(),
  deliveredCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
});
export type FilemakerEmailCampaignRunDto = z.infer<typeof filemakerEmailCampaignRunSchema>;
export type FilemakerEmailCampaignRun = FilemakerEmailCampaignRunDto;

export const filemakerEmailCampaignDeliverySchema = dtoBaseSchema.extend({
  campaignId: z.string(),
  runId: z.string(),
  emailId: z.string().nullable().optional(),
  emailAddress: z.string(),
  partyKind: filemakerPartyKindSchema,
  partyId: z.string(),
  status: filemakerEmailCampaignDeliveryStatusSchema,
  provider: filemakerEmailCampaignDeliveryProviderSchema.nullable().optional(),
  failureCategory: filemakerEmailCampaignDeliveryFailureCategorySchema.nullable().optional(),
  providerMessage: z.string().nullable().optional(),
  lastError: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
  nextRetryAt: z.string().nullable().optional(),
});
export type FilemakerEmailCampaignDeliveryDto = z.infer<
  typeof filemakerEmailCampaignDeliverySchema
>;
export type FilemakerEmailCampaignDelivery = FilemakerEmailCampaignDeliveryDto;

export const filemakerEmailCampaignDeliveryAttemptSchema = dtoBaseSchema.extend({
  campaignId: z.string(),
  runId: z.string(),
  deliveryId: z.string(),
  emailAddress: z.string(),
  partyKind: filemakerPartyKindSchema,
  partyId: z.string(),
  attemptNumber: z.number().int().positive(),
  status: filemakerEmailCampaignDeliveryAttemptStatusSchema,
  provider: filemakerEmailCampaignDeliveryProviderSchema.nullable().optional(),
  failureCategory: filemakerEmailCampaignDeliveryFailureCategorySchema.nullable().optional(),
  providerMessage: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  attemptedAt: z.string().nullable().optional(),
});
export type FilemakerEmailCampaignDeliveryAttemptDto = z.infer<
  typeof filemakerEmailCampaignDeliveryAttemptSchema
>;
export type FilemakerEmailCampaignDeliveryAttempt = FilemakerEmailCampaignDeliveryAttemptDto;

export const filemakerEmailCampaignEventSchema = dtoBaseSchema.extend({
  campaignId: z.string(),
  runId: z.string().nullable().optional(),
  deliveryId: z.string().nullable().optional(),
  type: filemakerEmailCampaignEventTypeSchema,
  message: z.string(),
  actor: z.string().nullable().optional(),
  targetUrl: z.string().nullable().optional(),
  mailThreadId: z.string().nullable().optional(),
  mailMessageId: z.string().nullable().optional(),
  runStatus: filemakerEmailCampaignRunStatusSchema.nullable().optional(),
  deliveryStatus: filemakerEmailCampaignDeliveryStatusSchema.nullable().optional(),
});
export type FilemakerEmailCampaignEventDto = z.infer<
  typeof filemakerEmailCampaignEventSchema
>;
export type FilemakerEmailCampaignEvent = FilemakerEmailCampaignEventDto;

export const filemakerEmailCampaignEventRegistrySchema = z.object({
  version: z.number().int().nonnegative(),
  events: z.array(filemakerEmailCampaignEventSchema),
});
export type FilemakerEmailCampaignEventRegistryDto = z.infer<
  typeof filemakerEmailCampaignEventRegistrySchema
>;
export type FilemakerEmailCampaignEventRegistry = FilemakerEmailCampaignEventRegistryDto;

export const filemakerEmailCampaignSuppressionEntrySchema = dtoBaseSchema.extend({
  emailAddress: z.string(),
  reason: filemakerEmailCampaignSuppressionReasonSchema,
  actor: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  deliveryId: z.string().nullable().optional(),
});
export type FilemakerEmailCampaignSuppressionEntryDto = z.infer<
  typeof filemakerEmailCampaignSuppressionEntrySchema
>;
export type FilemakerEmailCampaignSuppressionEntry =
  FilemakerEmailCampaignSuppressionEntryDto;

export const filemakerEmailCampaignSuppressionRegistrySchema = z.object({
  version: z.number().int().nonnegative(),
  entries: z.array(filemakerEmailCampaignSuppressionEntrySchema),
});
export type FilemakerEmailCampaignSuppressionRegistryDto = z.infer<
  typeof filemakerEmailCampaignSuppressionRegistrySchema
>;
export type FilemakerEmailCampaignSuppressionRegistry =
  FilemakerEmailCampaignSuppressionRegistryDto;

export const filemakerEmailCampaignRegistrySchema = z.object({
  version: z.number().int().nonnegative(),
  campaigns: z.array(filemakerEmailCampaignSchema),
});
export type FilemakerEmailCampaignRegistryDto = z.infer<
  typeof filemakerEmailCampaignRegistrySchema
>;
export type FilemakerEmailCampaignRegistry = FilemakerEmailCampaignRegistryDto;

export const filemakerEmailCampaignRunRegistrySchema = z.object({
  version: z.number().int().nonnegative(),
  runs: z.array(filemakerEmailCampaignRunSchema),
});
export type FilemakerEmailCampaignRunRegistryDto = z.infer<
  typeof filemakerEmailCampaignRunRegistrySchema
>;
export type FilemakerEmailCampaignRunRegistry = FilemakerEmailCampaignRunRegistryDto;

export const filemakerEmailCampaignDeliveryRegistrySchema = z.object({
  version: z.number().int().nonnegative(),
  deliveries: z.array(filemakerEmailCampaignDeliverySchema),
});
export type FilemakerEmailCampaignDeliveryRegistryDto = z.infer<
  typeof filemakerEmailCampaignDeliveryRegistrySchema
>;
export type FilemakerEmailCampaignDeliveryRegistry =
  FilemakerEmailCampaignDeliveryRegistryDto;

export const filemakerEmailCampaignDeliveryAttemptRegistrySchema = z.object({
  version: z.number().int().nonnegative(),
  attempts: z.array(filemakerEmailCampaignDeliveryAttemptSchema),
});
export type FilemakerEmailCampaignDeliveryAttemptRegistryDto = z.infer<
  typeof filemakerEmailCampaignDeliveryAttemptRegistrySchema
>;
export type FilemakerEmailCampaignDeliveryAttemptRegistry =
  FilemakerEmailCampaignDeliveryAttemptRegistryDto;

export const filemakerEmailCampaignRunDispatchModeSchema = z.enum([
  'dry_run',
  'queued',
  'inline',
]);
export type FilemakerEmailCampaignRunDispatchModeDto = z.infer<
  typeof filemakerEmailCampaignRunDispatchModeSchema
>;
export type FilemakerEmailCampaignRunDispatchMode =
  FilemakerEmailCampaignRunDispatchModeDto;

export const filemakerEmailCampaignLaunchRunRequestSchema = z.object({
  campaignId: z.string().trim().min(1),
  mode: filemakerEmailCampaignRunModeSchema,
  launchReason: z.string().trim().min(1).nullable().optional(),
});
export type FilemakerEmailCampaignLaunchRunRequestDto = z.infer<
  typeof filemakerEmailCampaignLaunchRunRequestSchema
>;
export type FilemakerEmailCampaignLaunchRunRequest =
  FilemakerEmailCampaignLaunchRunRequestDto;

export const filemakerEmailCampaignLaunchRunResponseSchema = z.object({
  campaignId: z.string(),
  runId: z.string(),
  status: filemakerEmailCampaignRunStatusSchema,
  dispatchMode: filemakerEmailCampaignRunDispatchModeSchema,
  queueJobId: z.string().nullable().optional(),
  queuedDeliveryCount: z.number().int().nonnegative(),
});
export type FilemakerEmailCampaignLaunchRunResponseDto = z.infer<
  typeof filemakerEmailCampaignLaunchRunResponseSchema
>;
export type FilemakerEmailCampaignLaunchRunResponse =
  FilemakerEmailCampaignLaunchRunResponseDto;

export const filemakerEmailCampaignProcessRunRequestSchema = z.object({
  reason: z.enum(['manual', 'retry']).default('manual'),
});
export type FilemakerEmailCampaignProcessRunRequestDto = z.infer<
  typeof filemakerEmailCampaignProcessRunRequestSchema
>;
export type FilemakerEmailCampaignProcessRunRequest =
  FilemakerEmailCampaignProcessRunRequestDto;

export const filemakerEmailCampaignProcessRunResponseSchema = z.object({
  campaignId: z.string(),
  runId: z.string(),
  status: filemakerEmailCampaignRunStatusSchema,
  dispatchMode: z.enum(['queued', 'inline']),
  queueJobId: z.string().nullable().optional(),
  queuedDeliveryCount: z.number().int().nonnegative(),
});
export type FilemakerEmailCampaignProcessRunResponseDto = z.infer<
  typeof filemakerEmailCampaignProcessRunResponseSchema
>;
export type FilemakerEmailCampaignProcessRunResponse =
  FilemakerEmailCampaignProcessRunResponseDto;

export const filemakerEmailCampaignCancelRunResponseSchema = z.object({
  campaignId: z.string(),
  runId: z.string(),
  status: filemakerEmailCampaignRunStatusSchema,
});
export type FilemakerEmailCampaignCancelRunResponseDto = z.infer<
  typeof filemakerEmailCampaignCancelRunResponseSchema
>;
export type FilemakerEmailCampaignCancelRunResponse =
  FilemakerEmailCampaignCancelRunResponseDto;

export const filemakerEmailCampaignTestSendRequestSchema = z.object({
  campaign: filemakerEmailCampaignSchema,
  recipientEmail: z.string().trim().email(),
});
export type FilemakerEmailCampaignTestSendRequestDto = z.infer<
  typeof filemakerEmailCampaignTestSendRequestSchema
>;
export type FilemakerEmailCampaignTestSendRequest =
  FilemakerEmailCampaignTestSendRequestDto;

export const filemakerEmailCampaignTestSendResponseSchema = z.object({
  campaignId: z.string(),
  recipientEmail: z.string(),
  provider: filemakerEmailCampaignDeliveryProviderSchema,
  providerMessage: z.string(),
  sentAt: z.string(),
});
export type FilemakerEmailCampaignTestSendResponseDto = z.infer<
  typeof filemakerEmailCampaignTestSendResponseSchema
>;
export type FilemakerEmailCampaignTestSendResponse =
  FilemakerEmailCampaignTestSendResponseDto;

export const filemakerEmailCampaignPreferenceStatusSchema = z.enum([
  'subscribed',
  'unsubscribed',
  'blocked',
]);
export type FilemakerEmailCampaignPreferenceStatusDto = z.infer<
  typeof filemakerEmailCampaignPreferenceStatusSchema
>;
export type FilemakerEmailCampaignPreferenceStatus =
  FilemakerEmailCampaignPreferenceStatusDto;

export const filemakerEmailCampaignPreferencesActionSchema = z.enum([
  'unsubscribe',
  'resubscribe',
]);
export type FilemakerEmailCampaignPreferencesActionDto = z.infer<
  typeof filemakerEmailCampaignPreferencesActionSchema
>;
export type FilemakerEmailCampaignPreferencesAction =
  FilemakerEmailCampaignPreferencesActionDto;

export const filemakerEmailCampaignPreferencesRequestSchema = z.object({
  token: z.string().trim().min(1),
  action: filemakerEmailCampaignPreferencesActionSchema,
  source: z.string().trim().min(1).nullable().optional(),
});
export type FilemakerEmailCampaignPreferencesRequestDto = z.infer<
  typeof filemakerEmailCampaignPreferencesRequestSchema
>;
export type FilemakerEmailCampaignPreferencesRequest =
  FilemakerEmailCampaignPreferencesRequestDto;

export const filemakerEmailCampaignPreferencesResponseSchema = z.object({
  ok: z.literal(true),
  emailAddress: z.string(),
  campaignId: z.string().nullable().optional(),
  status: filemakerEmailCampaignPreferenceStatusSchema,
  reason: filemakerEmailCampaignSuppressionReasonSchema.nullable().optional(),
  canResubscribe: z.boolean(),
});
export type FilemakerEmailCampaignPreferencesResponseDto = z.infer<
  typeof filemakerEmailCampaignPreferencesResponseSchema
>;
export type FilemakerEmailCampaignPreferencesResponse =
  FilemakerEmailCampaignPreferencesResponseDto;

export const filemakerEmailCampaignUnsubscribeRequestSchema = z
  .object({
    emailAddress: z.string().trim().min(3).email().optional(),
    campaignId: z.string().trim().min(1).nullable().optional(),
    source: z.string().trim().min(1).nullable().optional(),
    token: z.string().trim().min(1).nullable().optional(),
  })
  .refine((value) => Boolean(value.token?.trim() || value.emailAddress?.trim()), {
    message: 'Either token or emailAddress is required.',
    path: ['token'],
  });
export type FilemakerEmailCampaignUnsubscribeRequestDto = z.infer<
  typeof filemakerEmailCampaignUnsubscribeRequestSchema
>;
export type FilemakerEmailCampaignUnsubscribeRequest =
  FilemakerEmailCampaignUnsubscribeRequestDto;

export const filemakerEmailCampaignUnsubscribeResponseSchema = z.object({
  ok: z.literal(true),
  emailAddress: z.string(),
  campaignId: z.string().nullable().optional(),
  alreadySuppressed: z.boolean(),
  reason: filemakerEmailCampaignSuppressionReasonSchema,
});
export type FilemakerEmailCampaignUnsubscribeResponseDto = z.infer<
  typeof filemakerEmailCampaignUnsubscribeResponseSchema
>;
export type FilemakerEmailCampaignUnsubscribeResponse =
  FilemakerEmailCampaignUnsubscribeResponseDto;

export const filemakerDatabaseSchema = z.object({
  version: z.number().int().nonnegative(),
  persons: z.array(filemakerPersonSchema),
  organizations: z.array(filemakerOrganizationSchema),
  events: z.array(filemakerEventSchema),
  addresses: z.array(filemakerAddressSchema),
  addressLinks: z.array(filemakerAddressLinkSchema),
  phoneNumbers: z.array(filemakerPhoneNumberSchema),
  phoneNumberLinks: z.array(filemakerPhoneNumberLinkSchema),
  emails: z.array(filemakerEmailSchema),
  emailLinks: z.array(filemakerEmailLinkSchema),
  eventOrganizationLinks: z.array(filemakerEventOrganizationLinkSchema),
  values: z.array(filemakerValueSchema).default([]),
  valueParameters: z.array(filemakerValueParameterSchema).default([]),
  valueParameterLinks: z.array(filemakerValueParameterLinkSchema).default([]),
  organizationLegacyDemands: z.array(filemakerOrganizationLegacyDemandSchema).default([]),
});

export type FilemakerDatabaseDto = z.infer<typeof filemakerDatabaseSchema>;
export type FilemakerDatabase = FilemakerDatabaseDto;

export const filemakerPartyOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string().optional(),
  kind: filemakerPartyKindSchema.optional(),
});

export type FilemakerPartyOptionDto = z.infer<typeof filemakerPartyOptionSchema>;
export type FilemakerPartyOption = FilemakerPartyOptionDto;

export type FilemakerAddressFields = {
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
  countryId: string;
};

export type FilemakerEditableAddressDto = FilemakerAddressFields & {
  addressId: string;
  isDefault: boolean;
};

export type FilemakerEditableAddress = FilemakerEditableAddressDto;

type FilemakerPatternRule = {
  id: string;
  pattern: string;
  flags?: string | null;
  sequence?: number | null;
};

export type {
  FilemakerPatternRule,
  FilemakerPatternRule as FilemakerEmailParserRule,
  FilemakerPatternRule as FilemakerPhoneValidationRule,
};

export type FilemakerEmailExtractionResult = {
  emails: string[];
  totalMatches: number;
  invalidMatches: number;
  usedDefaultRules: boolean;
};

export type FilemakerPhoneValidationResult = {
  isValid: boolean;
  normalizedPhoneNumber: string;
  matchedRuleId: string | null;
  usedDefaultRules: boolean;
};

export type UpsertFilemakerPartyEmailsResult = {
  database: FilemakerDatabase;
  partyFound: boolean;
  createdEmailCount: number;
  linkedEmailCount: number;
  existingEmailCount: number;
  invalidEmailCount: number;
  appliedEmails: string[];
};

export type UpsertFilemakerPartyPhoneNumbersResult = {
  database: FilemakerDatabase;
  partyFound: boolean;
  createdPhoneNumberCount: number;
  linkedPhoneNumberCount: number;
  existingPhoneNumberCount: number;
  invalidPhoneNumberCount: number;
  appliedPhoneNumbers: string[];
};

export type FilemakerEmailCampaignSchedulerSkipReason = {
  count: number;
  reason: string;
};

export type FilemakerEmailCampaignSchedulerLaunchFailure = {
  campaignId: string;
  message: string;
};
