/* eslint-disable max-lines, max-lines-per-function, complexity, @typescript-eslint/strict-boolean-expressions */

import { normalizeAddressFields } from '@/shared/lib/filemaker/entity-builders';

import { normalizeString } from './filemaker-settings.helpers';
import { resolveFilemakerTechnologyIconUrl } from './technology-icons';
import {
  type FilemakerAddressLink,
  type FilemakerAddressOwnerKind,
  type FilemakerEmail,
  type FilemakerEmailLink,
  type FilemakerEvent,
  type FilemakerEventOrganizationLink,
  type FilemakerJobListing,
  type FilemakerJobListingLexiconLink,
  type FilemakerJobListingSalaryPeriod,
  type FilemakerJobListingStatus,
  type FilemakerLexiconTerm,
  type FilemakerLexiconTermCategory,
  type FilemakerLexiconType,
  type FilemakerLexiconTypeKey,
  type FilemakerLexiconValidationPattern,
  type FilemakerLexiconValidationPatternMatchMode,
  type FilemakerLexiconValidationPatternSourceScope,
  type FilemakerOrganizationLegacyDemand,
  type FilemakerPartyKind,
  type FilemakerPhoneNumber,
  type FilemakerPhoneNumberLink,
  type FilemakerValue,
  type FilemakerValueParameter,
  type FilemakerValueParameterLink,
} from './types';

const FILEMAKER_JOB_LISTING_STATUSES: FilemakerJobListingStatus[] = [
  'draft',
  'open',
  'paused',
  'closed',
];

const FILEMAKER_JOB_LISTING_SALARY_PERIODS: FilemakerJobListingSalaryPeriod[] = [
  'hourly',
  'monthly',
  'yearly',
  'fixed',
];

const FILEMAKER_LEXICON_TYPE_KEYS: FilemakerLexiconTypeKey[] = [
  'address',
  'benefit',
  'company_attribute',
  'contract_type',
  'employment_type',
  'experience_level',
  'language',
  'requirement',
  'responsibility',
  'salary',
  'start_date',
  'technology',
  'work_mode',
  'other',
];

const FILEMAKER_LEXICON_VALIDATION_PATTERN_MATCH_MODES: FilemakerLexiconValidationPatternMatchMode[] = [
  'contains',
  'exact',
  'partial',
  'regex',
];

const FILEMAKER_LEXICON_VALIDATION_PATTERN_SOURCE_SCOPES: FilemakerLexiconValidationPatternSourceScope[] = [
  'all',
  'address_candidate',
  'listing_field',
  'listing_field_benefit',
  'listing_field_contract',
  'listing_field_employment',
  'listing_field_experience',
  'listing_field_language',
  'listing_field_requirement',
  'listing_field_responsibility',
  'listing_field_salary',
  'listing_field_technology',
  'listing_field_work_mode',
  'section',
  'section_heading',
  'section_value',
  'snapshot_fact',
  'snapshot_pill',
  'unclassified',
];

const FILEMAKER_LEXICON_TYPE_SYSTEM_TIMESTAMP = '2026-04-29T00:00:00.000Z';
const FILEMAKER_LEXICON_VALIDATION_PATTERN_VERSION = 2;

export const FILEMAKER_LEXICON_TYPE_DEFINITIONS = [
  {
    key: 'address',
    label: 'Address',
    description: 'Physical office, work location, and address pills from job boards.',
    sortOrder: 10,
  },
  {
    key: 'benefit',
    label: 'Benefit',
    description: 'Employer-provided perks, benefits, and non-salary offer advantages.',
    sortOrder: 20,
  },
  {
    key: 'company_attribute',
    label: 'Company attribute',
    description: 'Company profile facts, traits, markets, and organization descriptors.',
    sortOrder: 30,
  },
  {
    key: 'contract_type',
    label: 'Contract type',
    description: 'Legal engagement forms such as B2B contract or contract of employment.',
    sortOrder: 40,
  },
  {
    key: 'employment_type',
    label: 'Employment type',
    description: 'Workload and schedule terms such as full-time or part-time.',
    sortOrder: 50,
  },
  {
    key: 'experience_level',
    label: 'Experience level',
    description: 'Seniority and role level labels from offer metadata.',
    sortOrder: 60,
  },
  {
    key: 'language',
    label: 'Language',
    description: 'Languages and language proficiency expectations.',
    sortOrder: 70,
  },
  {
    key: 'requirement',
    label: 'Requirement',
    description: 'Candidate requirements, qualifications, and expected skills.',
    sortOrder: 80,
  },
  {
    key: 'responsibility',
    label: 'Responsibility',
    description: 'Role duties and recurring responsibilities listed in offers.',
    sortOrder: 90,
  },
  {
    key: 'salary',
    label: 'Salary',
    description: 'Salary ranges, compensation hints, and pay-period metadata.',
    sortOrder: 100,
  },
  {
    key: 'start_date',
    label: 'Start date',
    description: 'Hiring timeline, immediate employment, and start date signals.',
    sortOrder: 110,
  },
  {
    key: 'technology',
    label: 'Technology',
    description: 'Technologies, tools, platforms, frameworks, and stacks.',
    sortOrder: 120,
  },
  {
    key: 'work_mode',
    label: 'Work mode',
    description: 'Remote, hybrid, office, and workplace arrangement labels.',
    sortOrder: 130,
  },
  {
    key: 'other',
    label: 'Other',
    description: 'Reusable pills that do not fit a more specific lexicon type.',
    sortOrder: 900,
  },
] as const satisfies ReadonlyArray<{
  key: FilemakerLexiconTypeKey;
  label: string;
  description: string;
  sortOrder: number;
}>;

export const FILEMAKER_LEXICON_VALIDATION_PATTERN_DEFINITIONS = [
  {
    id: 'filemaker-lexicon-validation-pattern-technology-section-blob-other',
    label: 'Technology section blob -> Other',
    priority: 10,
    matchMode: 'regex',
    pattern:
      'technologie\\s+ktorych\\s+uzywamy|technologies\\s+we\\s+use|wymagane[\\s\\S]{20,}mile\\s+widziane',
    targetTypeKey: 'other',
    sourceScope: 'snapshot_pill',
    confidence: 0.98,
    notes:
      'Keeps concatenated section/header text out of Technology. Individual technologies should be split first.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-technology-section-blob-unclassified-other',
    label: 'Technology section blob unclassified values -> Other',
    priority: 11,
    matchMode: 'regex',
    pattern:
      'technologie\\s+ktorych\\s+uzywamy|technologies\\s+we\\s+use|wymagane[\\s\\S]{20,}mile\\s+widziane',
    targetTypeKey: 'other',
    sourceScope: 'unclassified',
    confidence: 0.98,
    notes:
      'Keeps concatenated technology section text in Other during AI cleanup and manual reclassification.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-technology-section-blob-listing-field-other',
    label: 'Technology section blob listing fields -> Other',
    priority: 12,
    matchMode: 'regex',
    pattern:
      'technologie\\s+ktorych\\s+uzywamy|technologies\\s+we\\s+use|wymagane[\\s\\S]{20,}mile\\s+widziane',
    targetTypeKey: 'other',
    sourceScope: 'listing_field_technology',
    confidence: 0.98,
    notes:
      'Keeps concatenated technology section text in Other when it appears in structured listing fields.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-technology-section-blob-section-value-other',
    label: 'Technology section blob section values -> Other',
    priority: 13,
    matchMode: 'regex',
    pattern:
      'technologie\\s+ktorych\\s+uzywamy|technologies\\s+we\\s+use|wymagane[\\s\\S]{20,}mile\\s+widziane',
    targetTypeKey: 'other',
    sourceScope: 'section_value',
    confidence: 0.98,
    notes:
      'Keeps concatenated technology section text in Other when it appears as extracted section body text.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-requirement-sentence-section-value',
    label: 'Requirement sentence section values -> Requirement',
    priority: 15,
    matchMode: 'regex',
    pattern:
      '\\b(requirements?|qualifications?|must\\s+have|nice\\s+to\\s+have|wymagania|kwalifikacje|experience|knowledge|familiarity|ability|understanding|proficiency|degree|design\\s+and\\s+develop|develop\\s+backend|participate\\s+in\\s+business|implement\\s+integrations|design\\s+and\\s+optimize|backend\\s+technology\\s+stack|system\\s+will\\s+be\\s+developed|data\\s+security|operational\\s+stability|external\\s+maritime|port\\s+administration)\\b',
    targetTypeKey: 'requirement',
    sourceScope: 'section_value',
    confidence: 0.91,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-requirement-sentence-unclassified',
    label: 'Requirement sentence unclassified values -> Requirement',
    priority: 16,
    matchMode: 'regex',
    pattern:
      '\\b(requirements?|qualifications?|must\\s+have|nice\\s+to\\s+have|wymagania|kwalifikacje|experience|knowledge|familiarity|ability|understanding|proficiency|degree|design\\s+and\\s+develop|develop\\s+backend|participate\\s+in\\s+business|implement\\s+integrations|design\\s+and\\s+optimize|backend\\s+technology\\s+stack|system\\s+will\\s+be\\s+developed|data\\s+security|operational\\s+stability|external\\s+maritime|port\\s+administration)\\b',
    targetTypeKey: 'requirement',
    sourceScope: 'unclassified',
    confidence: 0.91,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-requirement-sentence-listing-field',
    label: 'Requirement sentence listing fields -> Requirement',
    priority: 17,
    matchMode: 'regex',
    pattern:
      '\\b(requirements?|qualifications?|must\\s+have|nice\\s+to\\s+have|wymagania|kwalifikacje|experience|knowledge|familiarity|ability|understanding|proficiency|degree|design\\s+and\\s+develop|develop\\s+backend|participate\\s+in\\s+business|implement\\s+integrations|design\\s+and\\s+optimize|backend\\s+technology\\s+stack|system\\s+will\\s+be\\s+developed|data\\s+security|operational\\s+stability|external\\s+maritime|port\\s+administration)\\b',
    targetTypeKey: 'requirement',
    sourceScope: 'listing_field_requirement',
    confidence: 0.91,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-responsibility-sentence-listing-field',
    label: 'Responsibility sentence listing fields -> Responsibility',
    priority: 18,
    matchMode: 'regex',
    pattern:
      '\\b(responsibilities?|responsibilit|obowiazki|zadania|zakres\\s+obowiazkow|maintain|support|own\\s+the|coordinate|collaborate|deliver)\\b',
    targetTypeKey: 'responsibility',
    sourceScope: 'listing_field_responsibility',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-contract-type',
    label: 'Contract forms -> Contract type',
    priority: 20,
    matchMode: 'regex',
    pattern:
      '\\bb2b\\b|kontrakt|contract\\s+of\\s+employment|employment\\s+contract|contract\\s+of\\s+specific\\s+task|mandate\\s+contract|mandate|\\bumowa\\b',
    targetTypeKey: 'contract_type',
    sourceScope: 'all',
    confidence: 0.96,
    notes: 'Contract forms are never employment_type.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-employment-type',
    label: 'Workload -> Employment type',
    priority: 30,
    matchMode: 'regex',
    pattern:
      'pelny\\s+etat|czesc\\s+etatu|\\betat\\b|full[-\\s]?time|part[-\\s]?time|internship|praktyk|staz',
    targetTypeKey: 'employment_type',
    sourceScope: 'all',
    confidence: 0.94,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-experience-level',
    label: 'Seniority phrases -> Experience level',
    priority: 35,
    matchMode: 'regex',
    pattern:
      'trainee|intern|junior|mid|regular|senior|expert|lead|principal|specialist|specjalista',
    targetTypeKey: 'experience_level',
    sourceScope: 'all',
    confidence: 0.93,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-language-polish-partial',
    label: 'Partial Polish language phrases -> Language',
    priority: 32,
    matchMode: 'partial',
    pattern:
      'komunikatywna komunikatywny znajomosc znajomość jezyk język jezyka języka angielski angielskiego english language',
    targetTypeKey: 'language',
    sourceScope: 'all',
    confidence: 0.55,
    notes:
      'Catches phrases such as "Komunikatywna znajomość języka angielskiego" before they can be misclassified.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-polish-requirement-partial',
    label: 'Partial Polish capability phrases -> Requirement',
    priority: 34,
    matchMode: 'partial',
    pattern:
      'wsparcie implementacja implementacji swiadomosc świadomość zasad accessibility wcag ssr dostepnosc dostępność',
    targetTypeKey: 'requirement',
    sourceScope: 'all',
    confidence: 0.55,
    notes:
      'Routes capability sentences such as SSR implementation support and WCAG awareness to Requirement.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-salary-values',
    label: 'Salary values -> Salary',
    priority: 36,
    matchMode: 'regex',
    pattern:
      '\\b(PLN|EUR|USD|GBP|CHF|CZK|SEK|NOK|DKK|zl|zł|brutto|netto|gross|net|salary|wynagrodzenie|widelki|widełki)\\b|\\b\\d+(?:[ .]\\d{3})*\\s*(?:-|–|do|to)\\s*\\d+(?:[ .]\\d{3})*\\b',
    targetTypeKey: 'salary',
    sourceScope: 'all',
    confidence: 0.92,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-location-with-remote-address',
    label: 'Location strings with remote suffix -> Other',
    priority: 39,
    matchMode: 'regex',
    pattern:
      '(poznan|warszawa|krakow|wroclaw|gdansk|lodz|katowice|wielkopolskie|mazowieckie|malopolskie|dolnoslaskie|pomorskie)[\\s\\S]*praca\\s+zdalna',
    targetTypeKey: 'other',
    sourceScope: 'all',
    confidence: 0.93,
    notes: 'Address data is stored in structured job-listing address fields, not lexicon pills.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-remote-work-mode',
    label: 'Remote phrases -> Work mode',
    priority: 40,
    matchMode: 'regex',
    pattern:
      '(?:100\\s*)?(?:cala\\s+polska\\s*)?\\(?praca\\s+zdalna\\)?|rekrutacja\\s+zdalna|remote',
    targetTypeKey: 'work_mode',
    sourceScope: 'all',
    confidence: 0.95,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-office-work-mode',
    label: 'Office and hybrid phrases -> Work mode',
    priority: 45,
    matchMode: 'regex',
    pattern:
      'office\\s+work|full\\s+office|on[-\\s]?site|onsite|stationary|stacjonarn|hybrid|hybrydow',
    targetTypeKey: 'work_mode',
    sourceScope: 'all',
    confidence: 0.94,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-polish-location-address',
    label: 'Polish location strings -> Other',
    priority: 50,
    matchMode: 'regex',
    pattern:
      'poznan|warszawa|krakow|wroclaw|gdansk|lodz|katowice|wielkopolskie|mazowieckie|malopolskie|dolnoslaskie|pomorskie|polska',
    targetTypeKey: 'other',
    sourceScope: 'address_candidate',
    confidence: 0.92,
    notes: 'Address candidates are parsed into structured address fields.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-address-string',
    label: 'Address strings -> Other',
    priority: 51,
    matchMode: 'regex',
    pattern:
      '\\b\\d{2}-\\d{3}\\b|(?:ul\\.?|ulica|al\\.?|aleja|pl\\.?|plac|street|road|rondo)\\s+[\\p{L}0-9. -]{2,}\\s+\\d+',
    targetTypeKey: 'other',
    sourceScope: 'address_candidate',
    confidence: 0.93,
    notes: 'Address candidates are parsed into structured address fields.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-address-listing-field',
    label: 'Listing field address strings -> Other',
    priority: 52,
    matchMode: 'regex',
    pattern:
      '\\b\\d{2}-\\d{3}\\b|(?:ul\\.?|ulica|al\\.?|aleja|pl\\.?|plac|street|road|rondo)\\s+[\\p{L}0-9. -]{2,}\\s+\\d+|poznan|warszawa|krakow|wroclaw|gdansk|lodz|katowice|wielkopolskie|mazowieckie|malopolskie|dolnoslaskie|pomorskie|polska',
    targetTypeKey: 'other',
    sourceScope: 'listing_field',
    confidence: 0.9,
    notes: 'Job listing addresses are parsed into structured fields.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-address-snapshot-pill',
    label: 'Snapshot location pills -> Other',
    priority: 53,
    matchMode: 'regex',
    pattern:
      '^(poznan|warszawa|krakow|wroclaw|gdansk|lodz|katowice|wielkopolskie|mazowieckie|malopolskie|dolnoslaskie|pomorskie|polska|\\([\\p{L}. -]+\\)|[\\p{L}. -]+\\([\\p{L}. -]+\\))(?:,\\s*[\\p{L}. ()-]+)*$',
    targetTypeKey: 'other',
    sourceScope: 'snapshot_pill',
    confidence: 0.91,
    notes: 'Location pills are not stored as lexicon address terms.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-address-unclassified',
    label: 'Unclassified location values -> Other',
    priority: 54,
    matchMode: 'regex',
    pattern:
      '^(poznan|warszawa|krakow|wroclaw|gdansk|lodz|katowice|wielkopolskie|mazowieckie|malopolskie|dolnoslaskie|pomorskie|polska|\\([\\p{L}. -]+\\)|[\\p{L}. -]+\\([\\p{L}. -]+\\))(?:,\\s*[\\p{L}. ()-]+)*$',
    targetTypeKey: 'other',
    sourceScope: 'unclassified',
    confidence: 0.91,
    notes: 'Location values are not stored as lexicon address terms.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-unclassified-region-address',
    label: 'Unclassified region names -> Other',
    priority: 55,
    matchMode: 'regex',
    pattern:
      '^(lower\\s+silesia|upper\\s+silesia|masovia|lesser\\s+poland|greater\\s+poland|pomerania|dolny\\s+slask|dolnoslaskie|slaskie|mazowieckie|malopolskie|wielkopolskie|pomorskie)$',
    targetTypeKey: 'other',
    sourceScope: 'unclassified',
    confidence: 0.91,
    notes: 'Region names are not stored as lexicon address terms.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-benefits',
    label: 'Perks and onboarding support -> Benefit',
    priority: 60,
    matchMode: 'regex',
    pattern:
      'benefity|prywatna\\s+opieka\\s+medyczna|owoce|spotkania\\s+integracyjne|parking\\s+dla\\s+pracownikow|strefa\\s+relaksu|program\\s+rekomendacji|buddy|wsparcie\\s+w\\s+rozwoju|rozwoju\\s+kompetencji|regularne\\s+integracje',
    targetTypeKey: 'benefit',
    sourceScope: 'all',
    confidence: 0.93,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-benefit-private-healthcare',
    label: 'Private healthcare benefit -> Benefit',
    priority: 61,
    matchMode: 'contains',
    pattern: 'prywatna opieka medyczna',
    targetTypeKey: 'benefit',
    sourceScope: 'all',
    confidence: 0.94,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-benefit-fruit',
    label: 'Fruit benefit -> Benefit',
    priority: 62,
    matchMode: 'contains',
    pattern: 'owoce',
    targetTypeKey: 'benefit',
    sourceScope: 'all',
    confidence: 0.94,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-benefit-integration-meetings',
    label: 'Integration meetings benefit -> Benefit',
    priority: 63,
    matchMode: 'contains',
    pattern: 'spotkania integracyjne',
    targetTypeKey: 'benefit',
    sourceScope: 'all',
    confidence: 0.94,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-benefit-employee-parking',
    label: 'Employee parking benefit -> Benefit',
    priority: 64,
    matchMode: 'contains',
    pattern: 'parking dla pracowników',
    targetTypeKey: 'benefit',
    sourceScope: 'all',
    confidence: 0.94,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-benefit-relax-zone',
    label: 'Relax zone benefit -> Benefit',
    priority: 65,
    matchMode: 'contains',
    pattern: 'strefa relaksu',
    targetTypeKey: 'benefit',
    sourceScope: 'all',
    confidence: 0.94,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-benefit-referral-program',
    label: 'Referral programme benefit -> Benefit',
    priority: 66,
    matchMode: 'contains',
    pattern: 'program rekomendacji pracowników',
    targetTypeKey: 'benefit',
    sourceScope: 'all',
    confidence: 0.94,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-start-date',
    label: 'Actual availability -> Start date',
    priority: 70,
    matchMode: 'regex',
    pattern: '\\b(immediate|asap)\\b|od\\s+zaraz|praca\\s+od\\s+zaraz|start\\s+date|data\\s+rozpoczecia',
    targetTypeKey: 'start_date',
    sourceScope: 'all',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-clean-technology',
    label: 'Clean technology labels -> Technology',
    priority: 80,
    matchMode: 'regex',
    pattern:
      '^(adobe\\s+xd|android|angular|ansible|api\\s+platform|asp\\s+net|aws|azure|bitbucket|c|css|cypress|docker|elasticsearch|express|figma|firebase|flutter|gcp|git|github|gitlab|go|golang|google\\s+cloud|graphql|html|java|javascript|jenkins|jira|k8s|kafka|kotlin|kubernetes|laravel|linux|mongodb|ms\\s+office|mysql|nestjs|net|next\\s+js|node|node\\s+js|php|postgres|postgresql|python|rabbitmq|rails|react|react\\s+js|redis|redux|rest|ruby|rust|sass|scala|scss|sql|svelte|swift|symfony|tailwind|tailwind\\s+css|terraform|typescript|vue|vue\\s+js)$',
    targetTypeKey: 'technology',
    sourceScope: 'all',
    confidence: 0.95,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-language',
    label: 'Human languages -> Language',
    priority: 90,
    matchMode: 'regex',
    pattern:
      '\\b(english|angielski|polish|polski|german|niemiecki|french|francuski|spanish|hiszpanski)\\b',
    targetTypeKey: 'language',
    sourceScope: 'all',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-section-requirement-heading',
    label: 'Requirement headings -> Requirement',
    priority: 100,
    matchMode: 'regex',
    pattern:
      'requirements?|wymagania|oczekujemy|must\\s+have|nice\\s+to\\s+have|kwalifikacje|qualifications|profile\\s+kandydata',
    targetTypeKey: 'requirement',
    sourceScope: 'section_heading',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-section-responsibility-heading',
    label: 'Responsibility headings -> Responsibility',
    priority: 110,
    matchMode: 'regex',
    pattern:
      'responsibilit|obowiazki|zadania|zakres\\s+obowiazkow|what\\s+you\\s+will\\s+do|role',
    targetTypeKey: 'responsibility',
    sourceScope: 'section_heading',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-section-technology-heading',
    label: 'Technology headings -> Technology',
    priority: 120,
    matchMode: 'regex',
    pattern: 'technolog|technology|technologies|tech\\s+stack|stack|narzedzia',
    targetTypeKey: 'technology',
    sourceScope: 'section_heading',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-section-benefit-heading',
    label: 'Benefit headings -> Benefit',
    priority: 130,
    matchMode: 'regex',
    pattern: 'benefits?|benefity|oferujemy|we\\s+offer|perks|pakiet\\s+benefitow',
    targetTypeKey: 'benefit',
    sourceScope: 'section_heading',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-section-language-heading',
    label: 'Language headings -> Language',
    priority: 140,
    matchMode: 'regex',
    pattern: 'languages?|jezyki|znajomosc\\s+jezykow',
    targetTypeKey: 'language',
    sourceScope: 'section_heading',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-section-company-heading',
    label: 'Company headings -> Company attribute',
    priority: 150,
    matchMode: 'regex',
    pattern: 'about\\s+company|about\\s+us|o\\s+firmie|company|pracodawca|industry|branza',
    targetTypeKey: 'company_attribute',
    sourceScope: 'section_heading',
    confidence: 0.86,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-address-label',
    label: 'Address fact labels -> Other',
    priority: 160,
    matchMode: 'regex',
    pattern: 'address|adres|company\\s+address|headquarters|office|siedziba',
    targetTypeKey: 'other',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
    notes: 'Address facts are parsed into structured address fields.',
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-contract-label',
    label: 'Contract fact labels -> Contract type',
    priority: 170,
    matchMode: 'regex',
    pattern: 'contract|contract\\s+type|typ\\s+umowy|umowa',
    targetTypeKey: 'contract_type',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-employment-label',
    label: 'Employment fact labels -> Employment type',
    priority: 180,
    matchMode: 'regex',
    pattern: 'employment\\s+type|wymiar\\s+pracy|etat',
    targetTypeKey: 'employment_type',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-experience-label',
    label: 'Experience fact labels -> Experience level',
    priority: 190,
    matchMode: 'regex',
    pattern: 'experience|experience\\s+level|level|poziom|seniority',
    targetTypeKey: 'experience_level',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-work-mode-label',
    label: 'Work mode fact labels -> Work mode',
    priority: 200,
    matchMode: 'regex',
    pattern: 'mode|tryb\\s+pracy|work\\s+mode',
    targetTypeKey: 'work_mode',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-technology-label',
    label: 'Technology fact labels -> Technology',
    priority: 210,
    matchMode: 'regex',
    pattern: 'stack|technologies|technology|technologia|technologie',
    targetTypeKey: 'technology',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-benefit-label',
    label: 'Benefit fact labels -> Benefit',
    priority: 220,
    matchMode: 'regex',
    pattern: 'benefit|benefits|benefity|perks|oferujemy',
    targetTypeKey: 'benefit',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-requirement-label',
    label: 'Requirement fact labels -> Requirement',
    priority: 230,
    matchMode: 'regex',
    pattern: 'requirements?|wymagania|kwalifikacje|qualifications',
    targetTypeKey: 'requirement',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-responsibility-label',
    label: 'Responsibility fact labels -> Responsibility',
    priority: 240,
    matchMode: 'regex',
    pattern: 'responsibilit|obowiazki|zadania',
    targetTypeKey: 'responsibility',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-language-label',
    label: 'Language fact labels -> Language',
    priority: 250,
    matchMode: 'regex',
    pattern: 'language|languages|jezyk|jezyki',
    targetTypeKey: 'language',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-start-date-label',
    label: 'Start date fact labels -> Start date',
    priority: 260,
    matchMode: 'regex',
    pattern: 'start\\s+date|availability|available\\s+from|data\\s+rozpoczecia',
    targetTypeKey: 'start_date',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-salary-label',
    label: 'Salary fact labels -> Salary',
    priority: 270,
    matchMode: 'regex',
    pattern: 'salary|salary\\s+range|compensation|wynagrodzenie|widelki',
    targetTypeKey: 'salary',
    sourceScope: 'snapshot_fact',
    confidence: 0.9,
  },
  {
    id: 'filemaker-lexicon-validation-pattern-fact-company-label',
    label: 'Company fact labels -> Company attribute',
    priority: 280,
    matchMode: 'regex',
    pattern: 'company\\s+size|industry|branza|sector|sektor',
    targetTypeKey: 'company_attribute',
    sourceScope: 'snapshot_fact',
    confidence: 0.86,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  priority: number;
  matchMode: FilemakerLexiconValidationPatternMatchMode;
  pattern: string;
  targetTypeKey: FilemakerLexiconTypeKey;
  sourceScope: FilemakerLexiconValidationPatternSourceScope;
  confidence: number;
  notes?: string;
}>;

const normalizeOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const normalizeStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry: unknown): string => normalizeString(entry))
        .filter((entry: string): boolean => entry.length > 0)
    )
  );
};

const normalizeJobListingStatus = (value: unknown): FilemakerJobListingStatus => {
  const normalized = normalizeString(value).toLowerCase();
  return (
    FILEMAKER_JOB_LISTING_STATUSES.find(
      (status: FilemakerJobListingStatus): boolean => status === normalized
    ) ?? 'draft'
  );
};

const normalizeJobListingSalaryPeriod = (value: unknown): FilemakerJobListingSalaryPeriod => {
  const normalized = normalizeString(value).toLowerCase();
  return (
    FILEMAKER_JOB_LISTING_SALARY_PERIODS.find(
      (period: FilemakerJobListingSalaryPeriod): boolean => period === normalized
    ) ?? 'monthly'
  );
};

const normalizeLexiconTypeKey = (value: unknown): FilemakerLexiconTypeKey => {
  const normalized = normalizeString(value).toLowerCase();
  return (
    FILEMAKER_LEXICON_TYPE_KEYS.find(
      (typeKey: FilemakerLexiconTypeKey): boolean => typeKey === normalized
    ) ?? 'other'
  );
};

const normalizeLexiconTermCategory = (value: unknown): FilemakerLexiconTermCategory =>
  normalizeLexiconTypeKey(value);

const normalizeLexiconValidationPatternMatchMode = (
  value: unknown
): FilemakerLexiconValidationPatternMatchMode => {
  const normalized = normalizeString(value).toLowerCase();
  return (
    FILEMAKER_LEXICON_VALIDATION_PATTERN_MATCH_MODES.find(
      (mode): boolean => mode === normalized
    ) ?? 'regex'
  );
};

const normalizeLexiconValidationPatternSourceScope = (
  value: unknown
): FilemakerLexiconValidationPatternSourceScope => {
  const normalized = normalizeString(value).toLowerCase();
  return (
    FILEMAKER_LEXICON_VALIDATION_PATTERN_SOURCE_SCOPES.find(
      (scope): boolean => scope === normalized
    ) ?? 'all'
  );
};

export {
  createFilemakerAddress,
  createFilemakerOrganization,
  createFilemakerPerson,
  formatFilemakerAddress,
} from '@/shared/lib/filemaker/entity-builders';

export const createFilemakerAddressLink = (input: {
  id: string;
  ownerKind: unknown;
  ownerId: unknown;
  addressId: unknown;
  isDefault?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerAddressLink => {
  const now = new Date().toISOString();
  const rawOwnerKind = normalizeString(input.ownerKind).toLowerCase();
  const ownerKind: FilemakerAddressOwnerKind =
    rawOwnerKind === 'person' ||
    rawOwnerKind === 'organization' ||
    rawOwnerKind === 'event' ||
    rawOwnerKind === 'job_listing'
      ? rawOwnerKind
      : 'person';
  return {
    id: normalizeString(input.id),
    ownerKind,
    ownerId: normalizeString(input.ownerId),
    addressId: normalizeString(input.addressId),
    isDefault: Boolean(input.isDefault),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerEvent = (input: {
  id: string;
  eventName: unknown;
  addressId?: unknown;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEvent => {
  const now = new Date().toISOString();
  const address = normalizeAddressFields({
    street: input.street,
    streetNumber: input.streetNumber,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    countryId: input.countryId,
  });
  return {
    id: normalizeString(input.id),
    eventName: normalizeString(input.eventName),
    addressId: normalizeString(input.addressId),
    street: address.street,
    streetNumber: address.streetNumber,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    countryId: address.countryId,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerPhoneNumber = (input: {
  id: string;
  phoneNumber: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerPhoneNumber => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    phoneNumber: normalizeString(input.phoneNumber),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerPhoneNumberLink = (input: {
  id: string;
  phoneNumberId: unknown;
  partyKind: unknown;
  partyId: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerPhoneNumberLink => {
  const now = new Date().toISOString();
  const rawPartyKind = normalizeString(input.partyKind).toLowerCase();
  const partyKind: FilemakerPartyKind = rawPartyKind === 'organization' ? 'organization' : 'person';
  return {
    id: normalizeString(input.id),
    phoneNumberId: normalizeString(input.phoneNumberId),
    partyKind,
    partyId: normalizeString(input.partyId),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerEmail = (input: {
  id: string;
  email: unknown;
  status?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEmail => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    email: normalizeString(input.email).toLowerCase(),
    status: (normalizeString(input.status).toLowerCase() ||
      'unverified') as FilemakerEmail['status'],
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerEmailLink = (input: {
  id: string;
  emailId: unknown;
  partyKind: unknown;
  partyId: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEmailLink => {
  const now = new Date().toISOString();
  const rawPartyKind = normalizeString(input.partyKind).toLowerCase();
  const partyKind: FilemakerPartyKind = rawPartyKind === 'organization' ? 'organization' : 'person';

  return {
    id: normalizeString(input.id),
    emailId: normalizeString(input.emailId),
    partyKind,
    partyId: normalizeString(input.partyId),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerEventOrganizationLink = (input: {
  id: string;
  eventId: unknown;
  organizationId: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEventOrganizationLink => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    eventId: normalizeString(input.eventId),
    organizationId: normalizeString(input.organizationId),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerValue = (input: {
  id: string;
  label: unknown;
  value?: unknown;
  parentId?: unknown;
  description?: unknown;
  sortOrder?: unknown;
  legacyUuid?: unknown;
  legacyParentUuids?: unknown;
  legacyListUuids?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerValue => {
  const now = new Date().toISOString();
  const sortOrder = Number(input.sortOrder);
  const legacyUuid = normalizeString(input.legacyUuid);
  const createdBy = normalizeString(input.createdBy);
  const updatedBy = normalizeString(input.updatedBy);
  const legacyParentUuids = Array.isArray(input.legacyParentUuids)
    ? input.legacyParentUuids
        .map((entry: unknown): string => normalizeString(entry))
        .filter((value: string): boolean => value.length > 0)
    : [];
  const legacyListUuids = Array.isArray(input.legacyListUuids)
    ? input.legacyListUuids
        .map((entry: unknown): string => normalizeString(entry))
        .filter((value: string): boolean => value.length > 0)
    : [];
  return {
    id: normalizeString(input.id),
    parentId: normalizeString(input.parentId) || null,
    label: normalizeString(input.label),
    value: normalizeString(input.value),
    description: normalizeString(input.description) || undefined,
    sortOrder: Number.isInteger(sortOrder) && sortOrder >= 0 ? sortOrder : 0,
    ...(legacyUuid.length > 0 ? { legacyUuid } : {}),
    ...(legacyParentUuids.length > 0 ? { legacyParentUuids } : {}),
    ...(legacyListUuids.length > 0 ? { legacyListUuids } : {}),
    ...(createdBy.length > 0 ? { createdBy } : {}),
    ...(updatedBy.length > 0 ? { updatedBy } : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerValueParameter = (input: {
  id: string;
  label: unknown;
  description?: unknown;
  legacyUuid?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerValueParameter => {
  const now = new Date().toISOString();
  const legacyUuid = normalizeString(input.legacyUuid);
  return {
    id: normalizeString(input.id),
    label: normalizeString(input.label),
    description: normalizeString(input.description) || undefined,
    ...(legacyUuid.length > 0 ? { legacyUuid } : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerValueParameterLink = (input: {
  id: string;
  valueId: unknown;
  parameterId: unknown;
  legacyValueUuid?: unknown;
  legacyParameterUuid?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerValueParameterLink => {
  const now = new Date().toISOString();
  const legacyValueUuid = normalizeString(input.legacyValueUuid);
  const legacyParameterUuid = normalizeString(input.legacyParameterUuid);
  return {
    id: normalizeString(input.id),
    valueId: normalizeString(input.valueId),
    parameterId: normalizeString(input.parameterId),
    ...(legacyValueUuid.length > 0 ? { legacyValueUuid } : {}),
    ...(legacyParameterUuid.length > 0 ? { legacyParameterUuid } : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerOrganizationLegacyDemand = (input: {
  id: string;
  organizationId: unknown;
  valueIds?: unknown;
  legacyUuid?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerOrganizationLegacyDemand => {
  const now = new Date().toISOString();
  const legacyUuid = normalizeString(input.legacyUuid);
  const valueIds = Array.isArray(input.valueIds)
    ? input.valueIds
        .map((entry: unknown): string => normalizeString(entry))
        .filter((valueId: string, index: number, values: string[]): boolean => {
          return valueId.length > 0 && values.indexOf(valueId) === index;
        })
        .slice(0, 4)
    : [];

  return {
    id: normalizeString(input.id),
    organizationId: normalizeString(input.organizationId),
    valueIds,
    ...(legacyUuid.length > 0 ? { legacyUuid } : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

const defaultFilemakerLexiconTypeId = (key: FilemakerLexiconTypeKey): string =>
  `filemaker-lexicon-type-${key}`;

export const createFilemakerLexiconType = (input: {
  id?: unknown;
  key: unknown;
  label?: unknown;
  description?: unknown;
  sortOrder?: unknown;
  system?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerLexiconType => {
  const now = new Date().toISOString();
  const key = normalizeLexiconTypeKey(input.key);
  const defaultDefinition = FILEMAKER_LEXICON_TYPE_DEFINITIONS.find(
    (definition): boolean => definition.key === key
  );
  const label = normalizeString(input.label) || defaultDefinition?.label || key;
  const description =
    normalizeString(input.description) || defaultDefinition?.description || undefined;
  const sortOrder = Number(input.sortOrder);
  return {
    id: normalizeString(input.id) || defaultFilemakerLexiconTypeId(key),
    key,
    label,
    ...(description ? { description } : {}),
    sortOrder:
      Number.isFinite(sortOrder) && sortOrder >= 0
        ? Math.floor(sortOrder)
        : defaultDefinition?.sortOrder ?? 0,
    system: input.system === undefined ? true : Boolean(input.system),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerLexiconTypes = (): FilemakerLexiconType[] =>
  FILEMAKER_LEXICON_TYPE_DEFINITIONS.map((definition) =>
    createFilemakerLexiconType({
      id: defaultFilemakerLexiconTypeId(definition.key),
      key: definition.key,
      label: definition.label,
      description: definition.description,
      sortOrder: definition.sortOrder,
      system: true,
      createdAt: FILEMAKER_LEXICON_TYPE_SYSTEM_TIMESTAMP,
      updatedAt: FILEMAKER_LEXICON_TYPE_SYSTEM_TIMESTAMP,
    })
  );

export const createFilemakerLexiconValidationPattern = (input: {
  id: string;
  label: unknown;
  enabled?: unknown;
  version?: unknown;
  priority?: unknown;
  matchMode?: unknown;
  pattern: unknown;
  targetTypeKey?: unknown;
  sourceScope?: unknown;
  confidence?: unknown;
  notes?: unknown;
  system?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerLexiconValidationPattern => {
  const now = new Date().toISOString();
  const priority = Number(input.priority);
  const confidence = Number(input.confidence);
  const version = Number(input.version);
  const notes = normalizeString(input.notes);
  return {
    id: normalizeString(input.id),
    label: normalizeString(input.label),
    enabled: input.enabled === undefined ? true : Boolean(input.enabled),
    version:
      Number.isFinite(version) && version >= 0
        ? Math.floor(version)
        : FILEMAKER_LEXICON_VALIDATION_PATTERN_VERSION,
    priority: Number.isFinite(priority) && priority >= 0 ? Math.floor(priority) : 100,
    matchMode: normalizeLexiconValidationPatternMatchMode(input.matchMode),
    pattern: normalizeString(input.pattern),
    targetTypeKey: normalizeLexiconTypeKey(input.targetTypeKey),
    sourceScope: normalizeLexiconValidationPatternSourceScope(input.sourceScope),
    confidence:
      Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : 1,
    ...(notes.length > 0 ? { notes } : {}),
    system: input.system === undefined ? true : Boolean(input.system),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerLexiconValidationPatterns =
  (): FilemakerLexiconValidationPattern[] =>
    FILEMAKER_LEXICON_VALIDATION_PATTERN_DEFINITIONS.map((definition) =>
      createFilemakerLexiconValidationPattern({
        ...definition,
        version: FILEMAKER_LEXICON_VALIDATION_PATTERN_VERSION,
        createdAt: FILEMAKER_LEXICON_TYPE_SYSTEM_TIMESTAMP,
        updatedAt: FILEMAKER_LEXICON_TYPE_SYSTEM_TIMESTAMP,
      })
    );

export const createFilemakerLexiconTerm = (input: {
  id: string;
  label: unknown;
  normalizedLabel?: unknown;
  typeKey?: unknown;
  category?: unknown;
  sourceSite?: unknown;
  sourceProvider?: unknown;
  iconUrl?: unknown;
  firstSeenAt?: unknown;
  lastSeenAt?: unknown;
  occurrenceCount?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerLexiconTerm => {
  const now = new Date().toISOString();
  const label = normalizeString(input.label);
  const requestedNormalizedLabel = normalizeString(input.normalizedLabel);
  const normalizedLabel =
    requestedNormalizedLabel.length > 0 ? requestedNormalizedLabel : label.toLowerCase();
  const sourceSite = normalizeString(input.sourceSite);
  const sourceProvider = normalizeString(input.sourceProvider);
  const requestedIconUrl = normalizeString(input.iconUrl);
  const firstSeenAt = normalizeString(input.firstSeenAt);
  const lastSeenAt = normalizeString(input.lastSeenAt);
  const occurrenceCount = Number(input.occurrenceCount);
  const typeKey = normalizeLexiconTermCategory(input.typeKey ?? input.category);
  const iconUrl =
    typeKey === 'technology'
      ? resolveFilemakerTechnologyIconUrl(label, requestedIconUrl)
      : requestedIconUrl;
  return {
    id: normalizeString(input.id),
    label,
    normalizedLabel,
    typeKey,
    category: typeKey,
    ...(sourceSite.length > 0 ? { sourceSite } : {}),
    ...(sourceProvider.length > 0 ? { sourceProvider } : {}),
    ...(iconUrl.length > 0 ? { iconUrl } : {}),
    ...(firstSeenAt.length > 0 ? { firstSeenAt } : {}),
    ...(lastSeenAt.length > 0 ? { lastSeenAt } : {}),
    occurrenceCount:
      Number.isFinite(occurrenceCount) && occurrenceCount >= 0
        ? Math.floor(occurrenceCount)
        : 0,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerJobListingLexiconLink = (input: {
  id: string;
  jobListingId: unknown;
  lexiconTermId: unknown;
  sourceSite?: unknown;
  sourceUrl?: unknown;
  sourceValue?: unknown;
  typeKey?: unknown;
  category?: unknown;
  position?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerJobListingLexiconLink => {
  const now = new Date().toISOString();
  const position = Number(input.position);
  const sourceSite = normalizeString(input.sourceSite);
  const sourceUrl = normalizeString(input.sourceUrl);
  const sourceValue = normalizeString(input.sourceValue);
  const typeKey = normalizeLexiconTermCategory(input.typeKey ?? input.category);
  return {
    id: normalizeString(input.id),
    jobListingId: normalizeString(input.jobListingId),
    lexiconTermId: normalizeString(input.lexiconTermId),
    ...(sourceSite.length > 0 ? { sourceSite } : {}),
    ...(sourceUrl.length > 0 ? { sourceUrl } : {}),
    ...(sourceValue.length > 0 ? { sourceValue } : {}),
    typeKey,
    category: typeKey,
    position: Number.isFinite(position) && position >= 0 ? Math.floor(position) : 0,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerJobListing = (input: {
  id: string;
  organizationId: unknown;
  title: unknown;
  description?: unknown;
  requirements?: unknown;
  responsibilities?: unknown;
  location?: unknown;
  addressId?: unknown;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  salaryMin?: unknown;
  salaryMax?: unknown;
  salaryCurrency?: unknown;
  salaryText?: unknown;
  salaryPeriod?: unknown;
  status?: unknown;
  targetedCampaignIds?: unknown;
  lastTargetedAt?: unknown;
  sourceExternalId?: unknown;
  sourceSite?: unknown;
  sourceUrl?: unknown;
  postedAt?: unknown;
  expiresAt?: unknown;
  scrapedAt?: unknown;
  lexiconTermIds?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerJobListing => {
  const now = new Date().toISOString();
  const salaryMin = normalizeOptionalNumber(input.salaryMin);
  const salaryMax = normalizeOptionalNumber(input.salaryMax);
  const lastTargetedAt = normalizeString(input.lastTargetedAt);
  const location = normalizeString(input.location);
  const scrapedAt = normalizeString(input.scrapedAt);
  const address = normalizeAddressFields({
    street: input.street,
    streetNumber: input.streetNumber,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    countryId: input.countryId,
  });
  const salaryCurrency = normalizeString(input.salaryCurrency).toUpperCase();
  const salaryText = normalizeString(input.salaryText);
  const sourceExternalId = normalizeString(input.sourceExternalId);
  const sourceSite = normalizeString(input.sourceSite);
  const sourceUrl = normalizeString(input.sourceUrl);
  const postedAt = normalizeString(input.postedAt);
  const expiresAt = normalizeString(input.expiresAt);
  return {
    id: normalizeString(input.id),
    organizationId: normalizeString(input.organizationId),
    title: normalizeString(input.title),
    description: normalizeString(input.description),
    ...(normalizeString(input.requirements).length > 0
      ? { requirements: normalizeString(input.requirements) }
      : {}),
    ...(normalizeString(input.responsibilities).length > 0
      ? { responsibilities: normalizeString(input.responsibilities) }
      : {}),
    ...(location.length > 0 ? { location } : {}),
    ...(normalizeString(input.addressId).length > 0
      ? { addressId: normalizeString(input.addressId) }
      : {}),
    ...(address.street.length > 0 ? { street: address.street } : {}),
    ...(address.streetNumber.length > 0 ? { streetNumber: address.streetNumber } : {}),
    ...(address.city.length > 0 ? { city: address.city } : {}),
    ...(address.postalCode.length > 0 ? { postalCode: address.postalCode } : {}),
    ...(address.country.length > 0 ? { country: address.country } : {}),
    ...(address.countryId.length > 0 ? { countryId: address.countryId } : {}),
    salaryMin,
    salaryMax,
    ...(salaryCurrency.length > 0 ? { salaryCurrency } : {}),
    ...(salaryText.length > 0 ? { salaryText } : {}),
    salaryPeriod: normalizeJobListingSalaryPeriod(input.salaryPeriod),
    status: normalizeJobListingStatus(input.status),
    targetedCampaignIds: normalizeStringList(input.targetedCampaignIds),
    ...(lastTargetedAt.length > 0 ? { lastTargetedAt } : {}),
    ...(sourceExternalId.length > 0 ? { sourceExternalId } : {}),
    ...(sourceSite.length > 0 ? { sourceSite } : {}),
    ...(sourceUrl.length > 0 ? { sourceUrl } : {}),
    ...(postedAt.length > 0 ? { postedAt } : {}),
    ...(expiresAt.length > 0 ? { expiresAt } : {}),
    ...(scrapedAt.length > 0 ? { scrapedAt } : {}),
    lexiconTermIds: normalizeStringList(input.lexiconTermIds),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};
