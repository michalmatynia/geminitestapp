import type { FilemakerAnyText } from './filemaker-anytext.types';
/* eslint-disable
   complexity,
   max-lines,
   max-lines-per-function,
   @typescript-eslint/strict-boolean-expressions
 */
import type { FilemakerContract } from './filemaker-contract.types';
import type { FilemakerDocument } from './filemaker-document.types';
import type {
  FilemakerPersonOccupation,
  FilemakerPersonOccupationValue,
} from './filemaker-person-occupation.types';
import type { MongoFilemakerWebsite } from './filemaker-websites.types';
import {
  createCvBlock,
  type CvBlock,
  type CvRowBlock,
  type CvTechStackItem,
} from './components/cv-builder/cv-block-model';
import type {
  FilemakerEmail,
  FilemakerLexiconTerm,
  FilemakerLexiconValidationPattern,
  FilemakerPerson,
  FilemakerPersonProfileEducation,
  FilemakerPersonProfileJobExperience,
  FilemakerPhoneNumber,
} from './types';
import { classifyFilemakerLexiconLabelWithPatterns } from './lexicon-validation-pattern-engine';
import {
  hasFilemakerTechnologyIconDefinition,
  normalizeFilemakerTechnologyIconKey,
  resolveFilemakerTechnologyDisplayLabel,
  resolveFilemakerTechnologyIconUrl,
} from './technology-icons';

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
  lexiconTerms?: FilemakerLexiconTerm[];
  lexiconValidationPatterns?: FilemakerLexiconValidationPattern[];
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
    | 'languageSkills'
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

const splitTechnicalStackText = (values: string[]): string[] => {
  const seen = new Set<string>();
  const items: string[] = [];
  values.forEach((value: string): void => {
    const afterColon = value.includes(':') ? (value.split(':').slice(1).join(':') || value) : value;
    afterColon
      .split(/[,;•\n]|\s+\/\s+|\s+\|\s+|\s+and\s+/i)
      .map((entry: string): string => entry.trim())
      .filter((entry: string): boolean => entry.length > 0)
      .forEach((entry: string): void => {
        const normalized = normalizeFilemakerTechnologyIconKey(entry);
        if (normalized.length === 0 || seen.has(normalized)) return;
        seen.add(normalized);
        items.push(entry);
      });
  });
  return items;
};

const buildTechnologyTermLookup = (
  terms: FilemakerLexiconTerm[] = []
): FilemakerLexiconTerm[] =>
  terms
    .filter((term: FilemakerLexiconTerm): boolean => term.typeKey === 'technology')
    .sort(
      (left: FilemakerLexiconTerm, right: FilemakerLexiconTerm): number =>
        normalizeFilemakerTechnologyIconKey(right.label).length -
        normalizeFilemakerTechnologyIconKey(left.label).length
    );

const isValidatedTechnologyLabel = (
  label: string,
  patterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): boolean =>
  classifyFilemakerLexiconLabelWithPatterns(patterns, {
    label,
    sourceScope: 'listing_field_technology',
  })?.typeKey === 'technology';

const technologyTermAliases = (term: FilemakerLexiconTerm): string[] => {
  const values = [
    term.label,
    term.normalizedLabel,
    resolveFilemakerTechnologyDisplayLabel(term.label),
  ];
  if (/\.js$/i.test(term.label)) values.push(term.label.replace(/\.js$/i, ''));
  if (/\bapi$/i.test(term.label)) values.push(`${term.label}s`);
  if (/\bapis$/i.test(term.label)) values.push(term.label.replace(/apis$/i, 'API'));
  return Array.from(
    new Set(
      values
        .map((value: string): string => normalizeFilemakerTechnologyIconKey(value))
        .filter((value: string): boolean => value.length >= 2)
    )
  );
};

const cvSourceMentionsTechnologyTerm = (
  sourceTextKey: string,
  term: FilemakerLexiconTerm
): boolean => {
  const paddedSource = ` ${sourceTextKey} `;
  return technologyTermAliases(term).some((alias: string): boolean =>
    paddedSource.includes(` ${alias} `)
  );
};

const exactLexiconTechnologyTermForCandidate = (
  candidate: string,
  terms: FilemakerLexiconTerm[]
): FilemakerLexiconTerm | null => {
  const candidateKey = normalizeFilemakerTechnologyIconKey(candidate);
  if (candidateKey.length === 0) return null;
  return terms.find((term: FilemakerLexiconTerm): boolean =>
    technologyTermAliases(term).includes(candidateKey)
  ) ?? null;
};

const buildTechnicalStackItems = (
  sourceValues: string[],
  explicitCandidateValues: string[],
  lexiconTerms: FilemakerLexiconTerm[] = [],
  lexiconValidationPatterns: FilemakerLexiconValidationPattern[] = []
): CvTechStackItem[] => {
  const terms = buildTechnologyTermLookup(lexiconTerms);
  const validationPatterns = lexiconValidationPatterns;
  const sourceTextKey = normalizeFilemakerTechnologyIconKey(sourceValues.join(' '));
  const seen = new Set<string>();
  const items: CvTechStackItem[] = [];
  const addItem = (label: string, term?: FilemakerLexiconTerm): void => {
    const key = normalizeFilemakerTechnologyIconKey(term?.normalizedLabel || term?.label || label);
    if (key.length === 0 || seen.has(key)) return;
    seen.add(key);
    items.push({
      label: term?.label ?? label,
      iconUrl: resolveFilemakerTechnologyIconUrl(term?.label ?? label, term?.iconUrl),
      ...(term?.id ? { lexiconTermId: term.id } : {}),
      ...(term?.normalizedLabel ? { normalizedLabel: term.normalizedLabel } : {}),
    });
  };

  terms
    .filter((term: FilemakerLexiconTerm): boolean =>
      isValidatedTechnologyLabel(term.label, validationPatterns) ||
      hasFilemakerTechnologyIconDefinition(term.label)
    )
    .filter((term: FilemakerLexiconTerm): boolean =>
      cvSourceMentionsTechnologyTerm(sourceTextKey, term)
    )
    .forEach((term: FilemakerLexiconTerm): void => {
      addItem(term.label, term);
    });

  splitTechnicalStackText(explicitCandidateValues).forEach((candidate: string): void => {
    const matchedTerm = exactLexiconTechnologyTermForCandidate(candidate, terms);
    const matchedKnownLabel =
      matchedTerm === null &&
      (isValidatedTechnologyLabel(candidate, validationPatterns) || hasFilemakerTechnologyIconDefinition(candidate))
        ? resolveFilemakerTechnologyDisplayLabel(candidate)
        : null;
    if (matchedTerm === null && matchedKnownLabel === null) return;
    addItem(matchedKnownLabel ?? candidate, matchedTerm ?? undefined);
  });

  return items.slice(0, 28);
};

const CV_MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const formatProfileExperienceMonth = (value: string | undefined): string => {
  const normalized = value?.trim() ?? '';
  const match = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(normalized);
  if (!match) return '';
  const month = Number(match[2]);
  if (month < 1 || month > 12) return '';
  return `${CV_MONTH_LABELS[month - 1]} ${match[1]}`;
};

const resolveProfileExperiencePeriod = (
  experience: FilemakerPersonProfileJobExperience
): string => {
  const startLabel = formatProfileExperienceMonth(experience.startDate);
  const endLabel = experience.isCurrent
    ? 'Present'
    : formatProfileExperienceMonth(experience.endDate);
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel && experience.isCurrent) return `${startLabel} - Present`;
  if (startLabel) return startLabel;
  if (endLabel && !experience.isCurrent) return endLabel;
  return experience.period;
};

const profileExperienceToCvBlock = (
  experience: FilemakerPersonProfileJobExperience
): CvBlock =>
  createCvBlock('experience', {
    title: experience.title,
    organization: experience.organization,
    period: resolveProfileExperiencePeriod(experience),
    location: experience.location ?? '',
    description: experience.description ?? '',
    highlights: experience.highlights ?? [],
  });

const profileEducationToCvBlock = (education: FilemakerPersonProfileEducation): CvBlock =>
  createCvBlock('education', {
    degree: education.degree,
    institution: education.institution,
    period: education.period,
    country: education.country ?? '',
    description: education.description ?? '',
  });

const collectTechnicalStackSourceValues = (seed: FilemakerCvProfileSeed): string[] => [
  ...(seed.person.cvSelectedTechnicalEnvironment ?? []),
  seed.person.cvHeadline ?? '',
  seed.person.cvProfessionalSummary ?? '',
  ...(seed.person.cvCoreStrengths ?? []),
  ...(seed.person.profileJobExperience ?? []).flatMap(
    (experience: FilemakerPersonProfileJobExperience): string[] => [
      experience.title,
      experience.organization,
      experience.description ?? '',
      ...(experience.highlights ?? []),
    ]
  ),
  ...(seed.person.profileEducation ?? []).flatMap(
    (education: FilemakerPersonProfileEducation): string[] => [
      education.degree,
      education.institution,
      education.country ?? '',
      education.description ?? '',
    ]
  ),
  ...(seed.anyTexts ?? []).map((entry: FilemakerAnyText): string => entry.text),
];

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
  const technicalStackItems = buildTechnicalStackItems(
    collectTechnicalStackSourceValues(seed),
    seed.person.cvSelectedTechnicalEnvironment ?? [],
    seed.lexiconTerms,
    seed.lexiconValidationPatterns
  );
  const technicalEnvironmentSection =
    technicalStackItems.length > 0
      ? createReferenceSection('Selected Technical Environment', [
          createCvBlock('techStack', {
            label: '',
            items: technicalStackItems,
          }),
        ])
      : buildCustomListSection(
          'Selected Technical Environment',
          seed.person.cvSelectedTechnicalEnvironment ?? []
      );
  const languageItems = seed.person.languageSkills ?? [];
  const languageSection =
    languageItems.length > 0
      ? createReferenceSection('Language Skills', [
          createCvBlock('languages', {
            label: '',
            items: languageItems,
          }),
        ])
      : null;

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
    ...(languageSection ? [languageSection] : []),
    ...(technicalEnvironmentSection ? [technicalEnvironmentSection] : []),
    ...(experienceSection ? [experienceSection] : []),
    ...(educationSection ? [educationSection] : []),
    ...(detailsSection ? [detailsSection] : []),
  ];
};
