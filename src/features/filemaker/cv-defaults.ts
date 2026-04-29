/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions */

import type { FilemakerAnyText } from './filemaker-anytext.types';
import type { FilemakerContract } from './filemaker-contract.types';
import type { FilemakerDocument } from './filemaker-document.types';
import type {
  FilemakerPersonOccupation,
  FilemakerPersonOccupationValue,
} from './filemaker-person-occupation.types';
import type { MongoFilemakerWebsite } from './filemaker-websites.types';
import { createCvBlock, type CvBlock, type CvRowBlock } from './components/cv-builder/cv-block-model';
import type {
  FilemakerEmail,
  FilemakerPerson,
  FilemakerPersonProfileEducation,
  FilemakerPersonProfileJobExperience,
  FilemakerPhoneNumber,
} from './types';

export type FilemakerCvAddressSeed = {
  city?: string;
  country?: string;
  postalCode?: string;
  street?: string;
  streetNumber?: string;
};

export type FilemakerCvProfileSeed = {
  anyTexts?: FilemakerAnyText[];
  contracts?: FilemakerContract[];
  documents?: FilemakerDocument[];
  emails?: FilemakerEmail[];
  occupations?: FilemakerPersonOccupation[];
  person: Pick<
    FilemakerPerson,
    | 'firstName'
    | 'lastName'
    | 'city'
    | 'country'
    | 'phoneNumbers'
    | 'linkedinUrl'
    | 'githubUrl'
    | 'profileEducation'
    | 'profileJobExperience'
    | 'cvHeadline'
    | 'cvProfessionalSummary'
    | 'cvCoreStrengths'
    | 'cvSelectedTechnicalEnvironment'
  >;
  phoneNumbers?: FilemakerPhoneNumber[];
  addresses?: FilemakerCvAddressSeed[];
  websites?: MongoFilemakerWebsite[];
};

const joinNonEmpty = (values: Array<string | null | undefined>, separator = ', '): string =>
  values
    .map((value: string | null | undefined): string => value?.trim() ?? '')
    .filter((value: string): boolean => value.length > 0)
    .join(separator);

const truncate = (value: string, limit: number): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 3)).trim()}...`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const linesToHtmlList = (items: string[]): string =>
  `<ul>${items.map((item: string): string => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;

const createReferenceSection = (label: string, children: CvBlock[]): CvBlock =>
  createCvBlock('section', {
    label,
    paddingX: 0,
    paddingY: 0,
    children,
  });

export const resolveFilemakerCvPersonName = (
  person: Pick<FilemakerPerson, 'firstName' | 'lastName'>
): string => {
  const label = joinNonEmpty([person.firstName, person.lastName], ' ');
  return label.length > 0 ? label : 'Untitled person';
};

const valueLabel = (value: FilemakerPersonOccupationValue): string =>
  value.label?.trim() || value.valueId?.trim() || value.legacyValueUuid;

const occupationPath = (occupation: FilemakerPersonOccupation): string => {
  const values = [...occupation.values].sort(
    (left: FilemakerPersonOccupationValue, right: FilemakerPersonOccupationValue): number =>
      left.level - right.level
  );
  if (values.length > 0) return values.map(valueLabel).join(' > ');
  return occupation.legacyValueUuids.join(' > ');
};

const resolveHeadline = (
  occupations: FilemakerPersonOccupation[] = [],
  profileJobExperience: FilemakerPersonProfileJobExperience[] = [],
  cvHeadline?: string
): string => {
  const configuredHeadline = cvHeadline?.trim() ?? '';
  if (configuredHeadline.length > 0) return configuredHeadline;
  return (
    profileJobExperience.find((entry) => entry.title.trim().length > 0)?.title ??
    occupations.map(occupationPath).find((entry: string): boolean => entry.trim().length > 0) ??
    ''
  );
};

const resolvePrimaryEmail = (emails: FilemakerEmail[] = []): string =>
  emails.find((email: FilemakerEmail): boolean => email.email.trim().length > 0)?.email ?? '';

const resolvePrimaryPhone = (
  person: Pick<FilemakerPerson, 'phoneNumbers'>,
  phoneNumbers: FilemakerPhoneNumber[] = []
): string => {
  const direct = person.phoneNumbers.find((entry: string): boolean => entry.trim().length > 0);
  if (direct) return direct;
  return phoneNumbers.find((entry: FilemakerPhoneNumber): boolean => entry.phoneNumber.trim().length > 0)?.phoneNumber ?? '';
};

const formatAddress = (address: FilemakerCvAddressSeed): string =>
  joinNonEmpty([
    joinNonEmpty([address.street, address.streetNumber], ' '),
    address.postalCode,
    address.city,
    address.country,
  ]);

const resolveLocation = (
  person: Pick<FilemakerPerson, 'city' | 'country'>,
  addresses: FilemakerCvAddressSeed[] = []
): string => {
  const address = addresses.map(formatAddress).find((entry: string): boolean => entry.length > 0);
  if (address) return address;
  return joinNonEmpty([person.city, person.country]);
};

const resolveWebsite = (websites: MongoFilemakerWebsite[] = []): string =>
  websites.find((website: MongoFilemakerWebsite): boolean => website.url.trim().length > 0)?.url ?? '';

const resolveSummary = (
  person: Pick<FilemakerPerson, 'cvProfessionalSummary'>,
  anyTexts: FilemakerAnyText[] = []
): string => {
  const profileSummary = person.cvProfessionalSummary?.trim() ?? '';
  if (profileSummary.length > 0) return profileSummary;
  const source = anyTexts.find((entry: FilemakerAnyText): boolean => entry.text.trim().length > 0);
  if (source) return truncate(source.text, 700);
  return 'Add a concise professional summary tailored to the role or opportunity.';
};

const contractTitle = (contract: FilemakerContract): string =>
  contract.firstEventName?.trim() || contract.onBehalfName?.trim() || 'Experience';

const contractOrganization = (contract: FilemakerContract): string =>
  contract.onBehalfName?.trim() || contract.personLinks[0]?.personName?.trim() || '';

const contractPeriod = (contract: FilemakerContract): string =>
  joinNonEmpty([contract.firstEventStartDate, contract.firstEventEndDate], ' - ');

const documentLabel = (document: FilemakerDocument): string =>
  document.documentName?.trim() ||
  document.documentTypeLabel?.trim() ||
  document.codeA?.trim() ||
  document.codeB?.trim() ||
  document.legacyUuid;

const buildCustomListSection = (label: string, items: string[]): CvBlock | null => {
  const normalizedItems = items
    .map((item: string): string => item.trim())
    .filter((item: string): boolean => item.length > 0);
  if (normalizedItems.length === 0) return null;
  return createReferenceSection(label, [
    createCvBlock('customText', {
      label: '',
      html: linesToHtmlList(normalizedItems),
    }),
  ]);
};

const profileExperienceToCvBlock = (
  experience: FilemakerPersonProfileJobExperience
): CvBlock =>
  createCvBlock('experience', {
    title: experience.title,
    organization: experience.organization,
    period: experience.period,
    location: experience.location ?? '',
    description: experience.description ?? '',
    highlights: experience.highlights ?? [],
  });

const profileEducationToCvBlock = (education: FilemakerPersonProfileEducation): CvBlock =>
  createCvBlock('education', {
    degree: education.degree,
    institution: education.institution,
    period: education.period,
    description: education.description ?? '',
  });

export const buildDefaultFilemakerCvBlocks = (seed: FilemakerCvProfileSeed): CvBlock[] => {
  const occupations = seed.occupations ?? [];
  const contracts = seed.contracts ?? [];
  const documents = seed.documents ?? [];
  const profileJobExperience = seed.person.profileJobExperience ?? [];
  const profileEducation = seed.person.profileEducation ?? [];
  const skills = Array.from(new Set(occupations.map(occupationPath).filter(Boolean))).slice(0, 12);
  const documentItems = documents.map(documentLabel).filter(Boolean).slice(0, 8);

  const profileHeader = createCvBlock('profileHeader', {
    name: resolveFilemakerCvPersonName(seed.person),
    headline: resolveHeadline(occupations, profileJobExperience, seed.person.cvHeadline),
    email: resolvePrimaryEmail(seed.emails),
    phone: resolvePrimaryPhone(seed.person, seed.phoneNumbers),
    location: resolveLocation(seed.person, seed.addresses),
    website: resolveWebsite(seed.websites),
    linkedinUrl: seed.person.linkedinUrl ?? '',
    githubUrl: seed.person.githubUrl ?? '',
  });
  const summarySection = createReferenceSection('Professional Summary', [
    createCvBlock('summary', { text: resolveSummary(seed.person, seed.anyTexts) }),
  ]);

  const coreStrengthsSection = buildCustomListSection(
    'Core Strengths',
    seed.person.cvCoreStrengths ?? []
  );
  const technicalEnvironmentSection = buildCustomListSection(
    'Selected Technical Environment',
    seed.person.cvSelectedTechnicalEnvironment ?? []
  );

  const experienceBlocks =
    profileJobExperience.length > 0
      ? profileJobExperience.slice(0, 8).map(profileExperienceToCvBlock)
      : contracts.slice(0, 6).map((contract: FilemakerContract) =>
          createCvBlock('experience', {
            title: contractTitle(contract),
            organization: contractOrganization(contract),
            period: contractPeriod(contract),
            description: joinNonEmpty(
              [
                contract.eventLinks[0]?.eventName,
                contract.onBehalfName ? `On behalf of ${contract.onBehalfName}` : '',
              ],
              '. '
            ),
          })
        );
  const experienceSection =
    experienceBlocks.length > 0
      ? createReferenceSection('Professional Experience', [
          createCvBlock('stack', {
            label: 'Experience stack',
            gap: 10,
            children: experienceBlocks,
          }),
        ])
      : null;

  const educationBlocks = profileEducation.slice(0, 8).map(profileEducationToCvBlock);
  const educationSection =
    educationBlocks.length > 0
      ? createReferenceSection('Education', [
          createCvBlock('stack', {
            label: 'Education stack',
            gap: 8,
            children: educationBlocks,
          }),
        ])
      : null;

  const detailsRows: CvRowBlock[] = [];
  if (skills.length > 0) {
    detailsRows.push(
      createCvBlock('row', {
        label: 'Skills column',
        paddingX: 0,
        paddingY: 0,
        children: [
          createCvBlock('skills', {
            label: 'Skills',
            items: skills,
          }),
        ],
      }) as CvRowBlock
    );
  }
  if (documentItems.length > 0) {
    detailsRows.push(
      createCvBlock('row', {
        label: 'Documents column',
        paddingX: 0,
        paddingY: 0,
        children: [
          createCvBlock('customText', {
            label: 'Documents',
            html: linesToHtmlList(documentItems),
          }),
        ],
      }) as CvRowBlock
    );
  }
  const detailsSection =
    detailsRows.length > 0
      ? createReferenceSection('Details', [
          createCvBlock('columns', {
            label: 'Details columns',
            gap: 24,
            children: detailsRows,
          }),
        ])
      : null;

  return [
    profileHeader,
    summarySection,
    ...(coreStrengthsSection ? [coreStrengthsSection] : []),
    ...(technicalEnvironmentSection ? [technicalEnvironmentSection] : []),
    ...(experienceSection ? [experienceSection] : []),
    ...(educationSection ? [educationSection] : []),
    ...(detailsSection ? [detailsSection] : []),
  ];
};
