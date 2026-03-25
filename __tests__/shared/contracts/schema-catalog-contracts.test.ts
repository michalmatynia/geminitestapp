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
      })
    ).toEqual(
      expect.objectContaining({
        version: 1,
        organizations: [expect.objectContaining({ id: 'organization-1' })],
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
