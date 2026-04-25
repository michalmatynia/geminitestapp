import { describe, expect, it } from 'vitest';

import {
  countryCodes,
  countrySchema,
  countryWithCurrenciesSchema,
  createCurrencySchema,
  currencyCodes,
  currencySchema,
  languageCodes,
  languageSchema,
  languageWithCountriesSchema,
  translationSchema,
} from '@/shared/contracts/internationalization';
import {
  KANGUR_AI_TUTOR_TRANSLATION_STATUSES,
  kangurAiTutorLocaleTranslationStatusSchema,
} from '@/shared/contracts/kangur-ai-tutor-locale-scaffold';
import { kangurSocialManualPipelineProgressSchema } from '@/shared/contracts/kangur-social-pipeline';
import {
  KANGUR_TEST_GROUPS_SETTING_KEY,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
  kangurTestGroupSchema,
  kangurTestQuestionSchema,
  kangurTestSuiteSchema,
} from '@/shared/contracts/kangur-tests';
import {
  filemakerEmailCampaignRegistrySchema,
  filemakerEmailCampaignLaunchRunRequestSchema,
  filemakerEmailCampaignLaunchRunResponseSchema,
  filemakerEmailCampaignDeliveryAttemptRegistrySchema,
  filemakerEmailCampaignDeliveryRegistrySchema,
  filemakerEmailCampaignEventRegistrySchema,
  filemakerEmailCampaignProcessRunRequestSchema,
  filemakerEmailCampaignProcessRunResponseSchema,
  filemakerEmailCampaignPreferencesRequestSchema,
  filemakerEmailCampaignPreferencesResponseSchema,
  filemakerEmailCampaignRunRegistrySchema,
  filemakerEmailCampaignRunSchema,
  filemakerEmailCampaignSuppressionRegistrySchema,
  filemakerEmailCampaignUnsubscribeRequestSchema,
  filemakerEmailCampaignUnsubscribeResponseSchema,
  filemakerEmailCampaignSchema,
  filemakerDatabaseSchema,
  filemakerPartyOptionSchema,
  filemakerPartyReferenceSchema,
} from '@/shared/contracts/filemaker';

const iso = '2026-03-25T15:00:00.000Z';

describe('shared contract runtime coverage for schema catalogs', () => {
  it('parses internationalization contracts and preserves canonical codes', () => {
    expect(countryCodes).toEqual(['PL', 'DE', 'GB', 'SE']);
    expect(currencyCodes).toEqual(['USD', 'EUR', 'PLN', 'GBP', 'SEK']);
    expect(languageCodes).toEqual(['EN', 'PL', 'DE', 'SV']);

    expect(
      languageSchema.parse({
        id: 'lang-pl',
        name: 'Polish',
        code: 'PL',
        nativeName: 'Polski',
        isDefault: true,
        isActive: true,
        createdAt: iso,
        updatedAt: iso,
      })
    ).toEqual(
      expect.objectContaining({
        code: 'PL',
      })
    );

    expect(
      countrySchema.parse({
        id: 'country-pl',
        name: 'Poland',
        code: 'PL',
        isoAlpha3: 'POL',
        nativeName: 'Polska',
        phoneCode: '+48',
        isActive: true,
        createdAt: iso,
        updatedAt: iso,
      })
    ).toEqual(
      expect.objectContaining({
        isoAlpha3: 'POL',
      })
    );

    expect(
      currencySchema.parse({
        id: 'currency-pln',
        name: 'Polish Zloty',
        code: 'PLN',
        symbol: 'zl',
        exchangeRate: 1,
        isDefault: true,
        isActive: true,
        createdAt: iso,
        updatedAt: iso,
      })
    ).toEqual(
      expect.objectContaining({
        symbol: 'zl',
      })
    );

    expect(
      createCurrencySchema.parse({
        name: 'Euro',
        code: 'EUR',
        symbol: 'EUR',
        exchangeRate: 4.2,
        isDefault: false,
        isActive: true,
      })
    ).toEqual(
      expect.objectContaining({
        code: 'EUR',
      })
    );

    expect(
      translationSchema.parse({
        id: 'translation-1',
        languageId: 'lang-pl',
        key: 'welcome',
        value: 'Witaj',
        namespace: 'common',
        createdAt: iso,
        updatedAt: iso,
      })
    ).toEqual(
      expect.objectContaining({
        namespace: 'common',
      })
    );

    expect(
      countryWithCurrenciesSchema.parse({
        id: 'country-pl',
        name: 'Poland',
        code: 'PL',
        isActive: true,
        currencies: [
          {
            currencyId: 'currency-pln',
            currency: {
              id: 'currency-pln',
              name: 'Polish Zloty',
              code: 'PLN',
              symbol: 'zl',
              isDefault: true,
              isActive: true,
            },
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        currencies: [expect.objectContaining({ currencyId: 'currency-pln' })],
      })
    );

    expect(
      languageWithCountriesSchema.parse({
        id: 'lang-pl',
        name: 'Polish',
        code: 'PL',
        nativeName: 'Polski',
        isDefault: true,
        isActive: true,
        countries: [
          {
            id: 'country-pl',
            name: 'Poland',
            code: 'PL',
            isActive: true,
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        countries: [expect.objectContaining({ code: 'PL' })],
      })
    );
  });

  it('parses filemaker contracts for references, options, and database exports', () => {
    expect(
      filemakerPartyReferenceSchema.parse({
        id: 'person-1',
        kind: 'person',
        name: 'Jan Kowalski',
      })
    ).toEqual(
      expect.objectContaining({
        kind: 'person',
      })
    );

    expect(
      filemakerPartyOptionSchema.parse({
        label: 'Jan Kowalski',
        value: 'person-1',
        description: 'Default contact',
        kind: 'person',
      })
    ).toEqual(
      expect.objectContaining({
        value: 'person-1',
      })
    );

    expect(
      filemakerDatabaseSchema.parse({
        version: 1,
        persons: [
          {
            id: 'person-1',
            firstName: 'Jan',
            lastName: 'Kowalski',
            addressId: 'address-1',
            street: 'Main',
            streetNumber: '1',
            city: 'Warsaw',
            postalCode: '00-001',
            country: 'Poland',
            countryId: 'PL',
            nip: '123',
            regon: '456',
            phoneNumbers: ['+48123123123'],
          },
        ],
        organizations: [
          {
            id: 'organization-1',
            name: 'Acme',
            addressId: 'address-1',
            street: 'Main',
            streetNumber: '1',
            city: 'Warsaw',
            postalCode: '00-001',
            country: 'Poland',
            countryId: 'PL',
            taxId: 'PL123',
            krs: '789',
          },
        ],
        events: [
          {
            id: 'event-1',
            eventName: 'Demo',
            addressId: 'address-1',
            street: 'Main',
            streetNumber: '1',
            city: 'Warsaw',
            postalCode: '00-001',
            country: 'Poland',
            countryId: 'PL',
          },
        ],
        addresses: [
          {
            id: 'address-1',
            street: 'Main',
            streetNumber: '1',
            city: 'Warsaw',
            postalCode: '00-001',
            country: 'Poland',
            countryId: 'PL',
          },
        ],
        addressLinks: [
          {
            id: 'address-link-1',
            ownerKind: 'person',
            ownerId: 'person-1',
            addressId: 'address-1',
            isDefault: true,
          },
        ],
        phoneNumbers: [
          {
            id: 'phone-1',
            phoneNumber: '+48123123123',
          },
        ],
        phoneNumberLinks: [
          {
            id: 'phone-link-1',
            phoneNumberId: 'phone-1',
            partyKind: 'person',
            partyId: 'person-1',
          },
        ],
        emails: [
          {
            id: 'email-1',
            email: 'jan@example.com',
            status: 'active',
          },
        ],
        emailLinks: [
          {
            id: 'email-link-1',
            emailId: 'email-1',
            partyKind: 'person',
            partyId: 'person-1',
          },
        ],
        eventOrganizationLinks: [
          {
            id: 'event-org-1',
            eventId: 'event-1',
            organizationId: 'organization-1',
          },
        ],
        values: [
          {
            id: 'value-1',
            parentId: null,
            label: 'Matter Type',
            value: 'matter_type',
            sortOrder: 0,
          },
        ],
        valueParameters: [
          {
            id: 'value-parameter-1',
            label: 'Colour',
          },
        ],
        valueParameterLinks: [
          {
            id: 'value-parameter-link-1',
            valueId: 'value-1',
            parameterId: 'value-parameter-1',
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        version: 1,
        organizations: [expect.objectContaining({ id: 'organization-1' })],
      })
    );

    expect(
      filemakerEmailCampaignSchema.parse({
        id: 'campaign-1',
        name: 'Expo Outreach',
        status: 'active',
        subject: 'Join our event',
        audience: {
          partyKinds: ['person', 'organization'],
          emailStatuses: ['active'],
          includePartyReferences: [],
          excludePartyReferences: [],
          conditionGroup: {
            id: 'audience-root',
            type: 'group',
            combinator: 'and',
            children: [],
          },
          organizationIds: ['organization-1'],
          eventIds: ['event-1'],
          countries: ['Poland'],
          cities: ['Warsaw'],
          dedupeByEmail: true,
          limit: 50,
        },
        launch: {
          mode: 'scheduled',
          scheduledAt: iso,
          recurring: null,
          minAudienceSize: 10,
          requireApproval: true,
          onlyWeekdays: true,
          allowedHourStart: 9,
          allowedHourEnd: 17,
          pauseOnBounceRatePercent: 5,
          timezone: 'UTC',
        },
        createdAt: iso,
        updatedAt: iso,
      })
    ).toEqual(
      expect.objectContaining({
        audience: expect.objectContaining({
          eventIds: ['event-1'],
        }),
        launch: expect.objectContaining({
          mode: 'scheduled',
        }),
      })
    );

    expect(
      filemakerEmailCampaignRunSchema.parse({
        id: 'run-1',
        campaignId: 'campaign-1',
        mode: 'dry_run',
        status: 'completed',
        recipientCount: 12,
        deliveredCount: 0,
        failedCount: 0,
        skippedCount: 12,
        createdAt: iso,
        updatedAt: iso,
      })
    ).toEqual(
      expect.objectContaining({
        mode: 'dry_run',
        skippedCount: 12,
      })
    );

    expect(
      filemakerEmailCampaignRegistrySchema.parse({
        version: 1,
        campaigns: [
          {
            id: 'campaign-1',
            name: 'Expo Outreach',
            status: 'draft',
            subject: 'Join our event',
            audience: {
              partyKinds: ['person'],
              emailStatuses: ['active'],
              includePartyReferences: [],
              excludePartyReferences: [],
              conditionGroup: {
                id: 'registry-audience-root',
                type: 'group',
                combinator: 'and',
                children: [],
              },
              organizationIds: [],
              eventIds: [],
              countries: [],
              cities: [],
              dedupeByEmail: true,
              limit: null,
            },
            launch: {
              mode: 'manual',
              scheduledAt: null,
              recurring: null,
              minAudienceSize: 1,
              requireApproval: false,
              onlyWeekdays: false,
              allowedHourStart: null,
              allowedHourEnd: null,
              pauseOnBounceRatePercent: null,
              timezone: 'UTC',
            },
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        campaigns: [expect.objectContaining({ id: 'campaign-1' })],
      })
    );

    expect(
      filemakerEmailCampaignRunRegistrySchema.parse({
        version: 1,
        runs: [
          {
            id: 'run-1',
            campaignId: 'campaign-1',
            mode: 'live',
            status: 'queued',
            recipientCount: 42,
            deliveredCount: 0,
            failedCount: 0,
            skippedCount: 0,
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        runs: [expect.objectContaining({ campaignId: 'campaign-1' })],
      })
    );

    expect(
      filemakerEmailCampaignDeliveryAttemptRegistrySchema.parse({
        version: 1,
        attempts: [
          {
            id: 'attempt-1',
            campaignId: 'campaign-1',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            attemptNumber: 1,
            status: 'sent',
            provider: 'smtp',
            attemptedAt: iso,
            createdAt: iso,
            updatedAt: iso,
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        attempts: [expect.objectContaining({ status: 'sent' })],
      })
    );

    expect(
      filemakerEmailCampaignDeliveryRegistrySchema.parse({
        version: 1,
        deliveries: [
          {
            id: 'delivery-1',
            campaignId: 'campaign-1',
            runId: 'run-1',
            emailId: 'email-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            status: 'queued',
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        deliveries: [expect.objectContaining({ runId: 'run-1' })],
      })
    );

    expect(
      filemakerEmailCampaignEventRegistrySchema.parse({
        version: 1,
        events: [
          {
            id: 'event-1',
            campaignId: 'campaign-1',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            type: 'clicked',
            targetUrl: 'https://destination.example.com/offer',
            message: 'jan@example.com clicked https://destination.example.com/offer.',
            actor: 'system',
            runStatus: 'running',
            deliveryStatus: 'sent',
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        events: [
          expect.objectContaining({
            type: 'clicked',
            targetUrl: 'https://destination.example.com/offer',
          }),
        ],
      })
    );

    expect(
      filemakerEmailCampaignSuppressionRegistrySchema.parse({
        version: 1,
        entries: [
          {
            id: 'suppression-1',
            emailAddress: 'blocked@example.com',
            reason: 'unsubscribed',
            actor: 'admin',
            notes: 'Manual opt-out',
            campaignId: 'campaign-1',
            runId: 'run-1',
            deliveryId: 'delivery-1',
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        entries: [expect.objectContaining({ reason: 'unsubscribed' })],
      })
    );

    expect(
      filemakerEmailCampaignLaunchRunRequestSchema.parse({
        campaignId: 'campaign-1',
        mode: 'live',
      })
    ).toEqual(
      expect.objectContaining({
        campaignId: 'campaign-1',
        mode: 'live',
      })
    );

    expect(
      filemakerEmailCampaignLaunchRunResponseSchema.parse({
        campaignId: 'campaign-1',
        runId: 'run-1',
        status: 'queued',
        dispatchMode: 'queued',
        queueJobId: 'job-1',
        queuedDeliveryCount: 2,
      })
    ).toEqual(
      expect.objectContaining({
        dispatchMode: 'queued',
        queuedDeliveryCount: 2,
      })
    );

    expect(filemakerEmailCampaignProcessRunRequestSchema.parse({})).toEqual({
      reason: 'manual',
    });

    expect(
      filemakerEmailCampaignProcessRunResponseSchema.parse({
        campaignId: 'campaign-1',
        runId: 'run-1',
        status: 'running',
        dispatchMode: 'inline',
        queueJobId: null,
        queuedDeliveryCount: 1,
      })
    ).toEqual(
      expect.objectContaining({
        dispatchMode: 'inline',
        queuedDeliveryCount: 1,
      })
    );

    expect(
      filemakerEmailCampaignPreferencesRequestSchema.parse({
        token: 'signed-token-value',
        action: 'unsubscribe',
        source: 'preferences-center',
      })
    ).toEqual(
      expect.objectContaining({
        action: 'unsubscribe',
        source: 'preferences-center',
      })
    );

    expect(
      filemakerEmailCampaignPreferencesResponseSchema.parse({
        ok: true,
        emailAddress: 'jan@example.com',
        campaignId: 'campaign-1',
        status: 'unsubscribed',
        reason: 'unsubscribed',
        canResubscribe: true,
      })
    ).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        status: 'unsubscribed',
        canResubscribe: true,
      })
    );

    expect(
      filemakerEmailCampaignUnsubscribeRequestSchema.parse({
        emailAddress: 'jan@example.com',
        campaignId: 'campaign-1',
        source: 'footer-link',
      })
    ).toEqual(
      expect.objectContaining({
        campaignId: 'campaign-1',
        source: 'footer-link',
      })
    );

    expect(
      filemakerEmailCampaignUnsubscribeRequestSchema.parse({
        token: 'signed-token-value',
      })
    ).toEqual(
      expect.objectContaining({
        token: 'signed-token-value',
      })
    );

    expect(
      filemakerEmailCampaignUnsubscribeResponseSchema.parse({
        ok: true,
        emailAddress: 'jan@example.com',
        campaignId: 'campaign-1',
        alreadySuppressed: false,
        reason: 'unsubscribed',
      })
    ).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        reason: 'unsubscribed',
      })
    );
  });

  it('parses Kangur test, locale scaffold, and social pipeline schemas', () => {
    expect(KANGUR_TEST_SUITES_SETTING_KEY).toBe('kangur_test_suites_v1');
    expect(KANGUR_TEST_QUESTIONS_SETTING_KEY).toBe('kangur_test_questions_v1');
    expect(KANGUR_TEST_GROUPS_SETTING_KEY).toBe('kangur_test_groups_v1');
    expect(KANGUR_AI_TUTOR_TRANSLATION_STATUSES).toEqual([
      'source-locale',
      'missing',
      'source-copy',
      'scaffolded',
      'manual',
    ]);

    expect(
      kangurAiTutorLocaleTranslationStatusSchema.parse({
        locale: 'pl',
        status: 'manual',
      })
    ).toEqual({
      locale: 'pl',
      status: 'manual',
    });

    expect(
      kangurSocialManualPipelineProgressSchema.parse({
        type: 'manual-post-pipeline',
        step: 'capturing',
        updatedAt: 5,
        captureFailures: [
          {
            id: 'capture-1',
            reason: 'network timeout',
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        captureMode: 'fresh_capture',
        captureFailureCount: null,
      })
    );

    expect(
      kangurTestSuiteSchema.parse({
        id: 'suite-1',
        title: 'Kangur 2026',
        year: 2026,
        category: 'math',
        sortOrder: 1,
      })
    ).toEqual(
      expect.objectContaining({
        publicationStatus: 'draft',
      })
    );

    expect(
      kangurTestGroupSchema.parse({
        id: 'group-1',
        title: 'Level A',
        sortOrder: 1,
      })
    ).toEqual(
      expect.objectContaining({
        enabled: true,
      })
    );

    expect(
      kangurTestQuestionSchema.parse({
        id: 'question-1',
        suiteId: 'suite-1',
        sortOrder: 1,
        prompt: 'What is 2 + 2?',
        choices: [
          {
            label: 'A',
            text: '4',
          },
          {
            label: 'B',
            text: '5',
          },
        ],
        correctChoiceLabel: 'A',
        illustration: {
          type: 'panels',
          panels: [
            {
              id: 'panel-1',
              label: 'Figure',
              svgContent: '<svg />',
            },
          ],
        },
      })
    ).toEqual(
      expect.objectContaining({
        pointValue: 3,
        presentation: {
          layout: 'classic',
          choiceStyle: 'list',
        },
      })
    );
  });
});
