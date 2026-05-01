'use client';

/* eslint-disable max-lines, max-lines-per-function */

import { Plus, Trash2 } from 'lucide-react';
import React from 'react';

import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import { Button, Input, Textarea } from '@/shared/ui/primitives.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';
import type {
  FilemakerPerson,
  FilemakerPersonLanguageSkill,
  FilemakerPersonProfileEducation,
  FilemakerPersonProfileJobExperience,
} from '../../types';

const createProfileEntryId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
};

const parseLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0);

const joinLines = (values: string[] | undefined): string => (values ?? []).join('\n');

const MONTH_LABELS = [
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

const MONTH_LOOKUP = new Map<string, number>([
  ['jan', 1],
  ['january', 1],
  ['feb', 2],
  ['february', 2],
  ['mar', 3],
  ['march', 3],
  ['apr', 4],
  ['april', 4],
  ['may', 5],
  ['jun', 6],
  ['june', 6],
  ['jul', 7],
  ['july', 7],
  ['aug', 8],
  ['august', 8],
  ['sep', 9],
  ['sept', 9],
  ['september', 9],
  ['oct', 10],
  ['october', 10],
  ['nov', 11],
  ['november', 11],
  ['dec', 12],
  ['december', 12],
]);

const toMonthValue = (year: string, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`;

const normalizeMonthInputValue = (value: string | undefined): string => {
  const normalized = value?.trim() ?? '';
  const monthValueMatch = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(normalized);
  if (monthValueMatch) {
    const month = Number(monthValueMatch[2]);
    if (month >= 1 && month <= 12) return toMonthValue(monthValueMatch[1] ?? '', month);
  }
  const labelMatch = /^([A-Za-z]{3,9})\.?\s+(\d{4})$/.exec(normalized);
  if (labelMatch) {
    const month = MONTH_LOOKUP.get((labelMatch[1] ?? '').toLowerCase());
    if (month !== undefined) return toMonthValue(labelMatch[2] ?? '', month);
  }
  return '';
};

const formatMonthInputValue = (value: string): string => {
  const normalized = normalizeMonthInputValue(value);
  if (!normalized) return '';
  const [year, monthRaw] = normalized.split('-');
  const month = Number(monthRaw);
  if (!year || month < 1 || month > 12) return '';
  return `${MONTH_LABELS[month - 1]} ${year}`;
};

const parseExperiencePeriodDates = (
  period: string
): { startDate: string; endDate: string; isCurrent: boolean } => {
  const [startRaw = '', endRaw = ''] = period.split(/\s+(?:-|–|—|to)\s+/i);
  const end = endRaw.trim();
  const isCurrent = /\b(?:present|current|now)\b/i.test(end);
  return {
    startDate: normalizeMonthInputValue(startRaw),
    endDate: isCurrent ? '' : normalizeMonthInputValue(end),
    isCurrent,
  };
};

const resolveExperienceDateState = (
  experience: FilemakerPersonProfileJobExperience
): { startDate: string; endDate: string; isCurrent: boolean } => {
  const parsed = parseExperiencePeriodDates(experience.period);
  const isCurrent = experience.isCurrent ?? parsed.isCurrent;
  return {
    startDate: normalizeMonthInputValue(experience.startDate) || parsed.startDate,
    endDate: isCurrent ? '' : normalizeMonthInputValue(experience.endDate) || parsed.endDate,
    isCurrent,
  };
};

const buildExperiencePeriod = (input: {
  endDate: string;
  isCurrent: boolean;
  startDate: string;
}): string => {
  const startLabel = formatMonthInputValue(input.startDate);
  const endLabel = input.isCurrent ? 'Present' : formatMonthInputValue(input.endDate);
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel && input.isCurrent) return `${startLabel} - Present`;
  if (startLabel) return startLabel;
  if (endLabel && !input.isCurrent) return endLabel;
  return '';
};

const updateDraft = (
  personDraft: Partial<FilemakerPerson>,
  setPersonDraft: (value: React.SetStateAction<Partial<FilemakerPerson>>) => void,
  patch: Partial<FilemakerPerson>
): void => {
  setPersonDraft({ ...personDraft, ...patch });
};

const emptyExperience = (): FilemakerPersonProfileJobExperience => ({
  id: createProfileEntryId('experience'),
  title: '',
  organization: '',
  period: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  location: '',
  description: '',
  highlights: [],
});

const emptyEducation = (): FilemakerPersonProfileEducation => ({
  id: createProfileEntryId('education'),
  degree: '',
  institution: '',
  period: '',
  country: '',
  description: '',
});

const emptyLanguageSkill = (): FilemakerPersonLanguageSkill => ({
  id: createProfileEntryId('language'),
  language: '',
  level: 5,
});

const normalizeLanguageLevel = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(10, Math.max(1, Math.round(parsed)));
};

const REFERENCE_CV_PROFILE: Partial<FilemakerPerson> = {
  firstName: 'Micha\u0142',
  lastName: 'Matynia',
  city: 'Szczecin',
  country: 'Poland',
  phoneNumbers: ['+48 79898 5231'],
  cvHeadline: 'Agentic Engineer | Full-Stack, Front-End & Integration Engineer',
  cvProfessionalSummary:
    'Engineer with 10+ years of experience across AI products, full-stack development, front-end engineering, e-commerce integrations, and database administration. Currently leading the development of StudiQ, a gamified learning product with AI-driven tutors. Strong hands-on background in product delivery, maintainable systems, user-facing experiences, automation, and remote collaboration.',
  cvCoreStrengths: [
    'AI products, agentic workflows, and educational technology',
    'Next.js, React, TypeScript, front-end delivery, and CMS-driven experiences',
    'Integration engineering, marketplace automation, Base.com, and AI-assisted workflows',
    'Architecture ownership, testing, maintainability, and end-to-end product execution',
  ],
  cvSelectedTechnicalEnvironment: [
    'Recent stack: Next.js, React, TypeScript, Expo / React Native, REST APIs, and monorepo-based product development',
    'AI and automation: AI tutors, agentic workflows, OpenAI / Gemini / GPT integrations, Ollama, and prompt-driven tooling',
    'Data, UI, and platform: MongoDB, Redis, BullMQ, TanStack Query, Tailwind CSS, Radix UI, CMS work, testing, and maintainable architecture',
  ],
  languageSkills: [
    { id: 'reference-cv-language-english', language: 'English', level: 10 },
    { id: 'reference-cv-language-polish', language: 'Polish', level: 10 },
  ],
  profileJobExperience: [
    {
      id: 'reference-cv-experience-studiq',
      title: 'Agentic Engineer for StudiQ',
      organization: 'studiqbeta.vercel.app (Self-employed)',
      period: 'Sep 2025 - Present',
      startDate: '2025-09',
      endDate: '',
      isCurrent: true,
      location: 'Szczecin, Poland | Remote',
      description: '',
      highlights: [
        'Lead end-to-end development of StudiQ, a gamified learning product with AI-driven tutors.',
        'Own architecture, implementation, and testing with strong emphasis on maintainability and long-term product quality.',
        'Delivered configurable lesson systems, learner profiles, and interactive minigame experiences to increase engagement.',
        'Build a cross-platform product environment spanning web, API, admin, and mobile-facing capabilities in a shared codebase.',
      ],
    },
    {
      id: 'reference-cv-experience-stargater',
      title: 'Software Integration Engineer',
      organization: 'Stargater.net (Freelance)',
      period: 'Jun 2024 - May 2025',
      startDate: '2024-06',
      endDate: '2025-05',
      isCurrent: false,
      location: 'Szczecin, Poland | Remote',
      description: '',
      highlights: [
        'Designed and implemented e-commerce integration solutions to improve marketplace operations.',
        'Configured Base.com integrations for a diverse product catalog across multiple sales channels.',
        'Developed a custom AI-powered sub-integrator for one-click product listing and workflow automation.',
        'Used Ollama and Gemma / GPT-based workflows to streamline post-production and operational tasks.',
      ],
    },
    {
      id: 'reference-cv-experience-lastminute',
      title: 'Front End Developer',
      organization: 'lastminute.com (Full-time)',
      period: 'Jan 2022 - Mar 2024',
      startDate: '2022-01',
      endDate: '2024-03',
      isCurrent: false,
      location: 'Remote',
      description: '',
      highlights: [
        'Analyzed CMS issues and delivered improvements based on Jira tickets and product requirements.',
        'Performed bug investigation and resolution work to improve website performance and user experience.',
        'Implemented UI enhancements and front-end refinements using Next.js and React.',
      ],
    },
    {
      id: 'reference-cv-experience-milkbardesigners',
      title: 'Full-Stack Developer',
      organization: 'Milkbardesigners.com (Full-time)',
      period: 'Oct 2012 - Mar 2020',
      startDate: '2012-10',
      endDate: '2020-03',
      isCurrent: false,
      location: 'Szczecin, Poland | On-site',
      description: '',
      highlights: [
        'Built applications designed to improve customer engagement and support new business acquisition.',
        'Worked directly with clients to translate needs into practical digital solutions.',
        'Delivered user-friendly front-end interfaces and robust back-end functionality supporting 3D architectural visualization work.',
      ],
    },
    {
      id: 'reference-cv-experience-pg',
      title: 'Database Administrator',
      organization: 'Procter & Gamble (Full-time)',
      period: 'Jun 2007 - Aug 2010',
      startDate: '2007-06',
      endDate: '2010-08',
      isCurrent: false,
      location: 'Dublin, Ireland | On-site',
      description: '',
      highlights: [
        'Managed SQL database administration tasks with emphasis on reliability, performance, and operational continuity.',
        'Monitored environments, diagnosed issues proactively, and carried out cleanup and maintenance activities.',
        'Handled support tickets and client information management to improve response quality and user satisfaction.',
      ],
    },
  ],
  profileEducation: [
    {
      id: 'reference-cv-education-dalarna',
      degree: 'Master\'s Degree in Media & Communication',
      institution: 'Dalarna University',
      period: '2004 - 2005',
      country: 'Sweden',
      description: '',
    },
    {
      id: 'reference-cv-education-szczecin',
      degree: 'Bachelor\'s Degree in English Language & Literature',
      institution: 'University of Szczecin',
      period: '2001 - 2003',
      country: 'Poland',
      description: '',
    },
  ],
};

const cloneReferenceCvProfile = (): Partial<FilemakerPerson> => ({
  ...REFERENCE_CV_PROFILE,
  cvCoreStrengths: [...(REFERENCE_CV_PROFILE.cvCoreStrengths ?? [])],
  cvSelectedTechnicalEnvironment: [
    ...(REFERENCE_CV_PROFILE.cvSelectedTechnicalEnvironment ?? []),
  ],
  languageSkills: (REFERENCE_CV_PROFILE.languageSkills ?? []).map(
    (skill: FilemakerPersonLanguageSkill): FilemakerPersonLanguageSkill => ({
      ...skill,
    })
  ),
  profileEducation: (REFERENCE_CV_PROFILE.profileEducation ?? []).map(
    (education: FilemakerPersonProfileEducation): FilemakerPersonProfileEducation => ({
      ...education,
    })
  ),
  profileJobExperience: (REFERENCE_CV_PROFILE.profileJobExperience ?? []).map(
    (experience: FilemakerPersonProfileJobExperience): FilemakerPersonProfileJobExperience => ({
      ...experience,
      highlights: [...(experience.highlights ?? [])],
    })
  ),
});

const hasArrayEntries = (values: unknown): boolean => Array.isArray(values) && values.length > 0;

const isMichalMatyniaDraft = (personDraft: Partial<FilemakerPerson>): boolean => {
  const firstName = (personDraft.firstName ?? '').trim().toLocaleLowerCase('pl-PL');
  const lastName = (personDraft.lastName ?? '').trim().toLocaleLowerCase('pl-PL');
  return firstName === 'micha\u0142' && lastName === 'matynia';
};

const mergeMissingReferenceCvProfile = (
  current: Partial<FilemakerPerson>
): Partial<FilemakerPerson> => {
  const reference = cloneReferenceCvProfile();
  return {
    ...current,
    firstName: current.firstName?.trim() ? current.firstName : reference.firstName,
    lastName: current.lastName?.trim() ? current.lastName : reference.lastName,
    city: current.city?.trim() ? current.city : reference.city,
    country: current.country?.trim() ? current.country : reference.country,
    phoneNumbers: hasArrayEntries(current.phoneNumbers)
      ? current.phoneNumbers
      : reference.phoneNumbers,
    cvHeadline: current.cvHeadline?.trim() ? current.cvHeadline : reference.cvHeadline,
    cvProfessionalSummary: current.cvProfessionalSummary?.trim()
      ? current.cvProfessionalSummary
      : reference.cvProfessionalSummary,
    cvCoreStrengths: hasArrayEntries(current.cvCoreStrengths)
      ? current.cvCoreStrengths
      : reference.cvCoreStrengths,
    cvSelectedTechnicalEnvironment: hasArrayEntries(current.cvSelectedTechnicalEnvironment)
      ? current.cvSelectedTechnicalEnvironment
      : reference.cvSelectedTechnicalEnvironment,
    languageSkills: hasArrayEntries(current.languageSkills)
      ? current.languageSkills
      : reference.languageSkills,
    profileJobExperience: hasArrayEntries(current.profileJobExperience)
      ? current.profileJobExperience
      : reference.profileJobExperience,
    profileEducation: hasArrayEntries(current.profileEducation)
      ? current.profileEducation
      : reference.profileEducation,
  };
};

function PersonProfileLinksAndCvFields(): React.JSX.Element {
  const { personDraft } = useAdminFilemakerPersonEditPageStateContext();
  const { setPersonDraft } = useAdminFilemakerPersonEditPageActionsContext();

  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
      <FormField label='LinkedIn link'>
        <Input
          value={personDraft.linkedinUrl ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            updateDraft(personDraft, setPersonDraft, { linkedinUrl: event.target.value });
          }}
          placeholder='https://www.linkedin.com/in/...'
          aria-label='Person LinkedIn link'
        />
      </FormField>
      <FormField label='GitHub link'>
        <Input
          value={personDraft.githubUrl ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            updateDraft(personDraft, setPersonDraft, { githubUrl: event.target.value });
          }}
          placeholder='https://github.com/...'
          aria-label='Person GitHub link'
        />
      </FormField>
      <FormField label='CV headline' className='md:col-span-2'>
        <Input
          value={personDraft.cvHeadline ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            updateDraft(personDraft, setPersonDraft, { cvHeadline: event.target.value });
          }}
          placeholder='Agentic Engineer | Full-Stack, Front-End & Integration Engineer'
          aria-label='CV headline'
        />
      </FormField>
      <FormField label='Professional summary' className='md:col-span-2'>
        <Textarea
          value={personDraft.cvProfessionalSummary ?? ''}
          rows={5}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            updateDraft(personDraft, setPersonDraft, {
              cvProfessionalSummary: event.target.value,
            });
          }}
          placeholder='Short CV-ready summary tailored to the target role.'
          aria-label='CV professional summary'
        />
      </FormField>
      <FormField label='Core strengths'>
        <Textarea
          value={joinLines(personDraft.cvCoreStrengths)}
          rows={6}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            updateDraft(personDraft, setPersonDraft, {
              cvCoreStrengths: parseLines(event.target.value),
            });
          }}
          placeholder='One strength per line'
          aria-label='CV core strengths'
        />
      </FormField>
      <FormField label='Selected technical environment'>
        <Textarea
          value={joinLines(personDraft.cvSelectedTechnicalEnvironment)}
          rows={6}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            updateDraft(personDraft, setPersonDraft, {
              cvSelectedTechnicalEnvironment: parseLines(event.target.value),
            });
          }}
          placeholder='One stack/environment item per line'
          aria-label='CV selected technical environment'
        />
      </FormField>
    </div>
  );
}

function LanguageSkillFields(props: {
  index: number;
  skill: FilemakerPersonLanguageSkill;
  onRemove: () => void;
  onUpdate: (patch: Partial<FilemakerPersonLanguageSkill>) => void;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 rounded-md border border-border/60 bg-card/20 p-3 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-end'>
      <FormField label={`Language ${props.index + 1}`}>
        <Input
          value={props.skill.language}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            props.onUpdate({ language: event.target.value });
          }}
          placeholder='English'
          aria-label={`Language skill ${props.index + 1} language`}
        />
      </FormField>
      <FormField label='Level 1-10'>
        <Input
          type='number'
          min={1}
          max={10}
          step={1}
          value={props.skill.level}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            props.onUpdate({ level: normalizeLanguageLevel(event.target.value) });
          }}
          aria-label={`Language skill ${props.index + 1} level`}
        />
      </FormField>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='size-9 text-red-300'
        aria-label={`Remove language skill ${props.index + 1}`}
        onClick={props.onRemove}
      >
        <Trash2 className='size-3.5' />
      </Button>
    </div>
  );
}

function PersonLanguageSkillFields(): React.JSX.Element {
  const { personDraft } = useAdminFilemakerPersonEditPageStateContext();
  const { setPersonDraft } = useAdminFilemakerPersonEditPageActionsContext();
  const languageSkills = personDraft.languageSkills ?? [];

  const updateLanguageSkill = (
    index: number,
    patch: Partial<FilemakerPersonLanguageSkill>
  ): void => {
    updateDraft(personDraft, setPersonDraft, {
      languageSkills: languageSkills.map(
        (
          skill: FilemakerPersonLanguageSkill,
          currentIndex: number
        ): FilemakerPersonLanguageSkill =>
          currentIndex === index ? { ...skill, ...patch } : skill
      ),
    });
  };

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-sm font-semibold text-white'>Language skills</h3>
          <p className='text-xs text-gray-500'>
            Add spoken or written languages with a numeric proficiency level from 1 to 10.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='gap-2'
          onClick={(): void => {
            updateDraft(personDraft, setPersonDraft, {
              languageSkills: [...languageSkills, emptyLanguageSkill()],
            });
          }}
        >
          <Plus className='size-3.5' />
          Add Language
        </Button>
      </div>
      {languageSkills.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 p-3 text-xs text-gray-500'>
          No language skills yet.
        </div>
      ) : (
        languageSkills.map((skill: FilemakerPersonLanguageSkill, index: number) => (
          <LanguageSkillFields
            key={skill.id ?? index}
            skill={skill}
            index={index}
            onUpdate={(patch: Partial<FilemakerPersonLanguageSkill>): void => {
              updateLanguageSkill(index, patch);
            }}
            onRemove={(): void => {
              updateDraft(personDraft, setPersonDraft, {
                languageSkills: languageSkills.filter(
                  (_entry: FilemakerPersonLanguageSkill, currentIndex: number): boolean =>
                    currentIndex !== index
                ),
              });
            }}
          />
        ))
      )}
    </div>
  );
}

function JobExperienceFields(props: {
  experience: FilemakerPersonProfileJobExperience;
  index: number;
  onRemove: () => void;
  onUpdate: (patch: Partial<FilemakerPersonProfileJobExperience>) => void;
}): React.JSX.Element {
  const dateState = resolveExperienceDateState(props.experience);
  const updateDateState = (
    patch: Partial<{ endDate: string; isCurrent: boolean; startDate: string }>
  ): void => {
    const nextState = { ...dateState, ...patch };
    const nextEndDate = nextState.isCurrent ? '' : nextState.endDate;
    props.onUpdate({
      startDate: nextState.startDate,
      endDate: nextEndDate,
      isCurrent: nextState.isCurrent,
      period: buildExperiencePeriod({ ...nextState, endDate: nextEndDate }),
    });
  };

  return (
    <div className='rounded-md border border-border/60 bg-card/20 p-3'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <div className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
          Job experience {props.index + 1}
        </div>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-7 text-red-300'
          aria-label={`Remove job experience ${props.index + 1}`}
          onClick={props.onRemove}
        >
          <Trash2 className='size-3.5' />
        </Button>
      </div>
      <div className='grid gap-3 md:grid-cols-2'>
        <FormField label='Role'>
          <Input
            value={props.experience.title}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              props.onUpdate({ title: event.target.value });
            }}
            aria-label={`Job experience ${props.index + 1} role`}
          />
        </FormField>
        <FormField label='Organization'>
          <Input
            value={props.experience.organization}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              props.onUpdate({ organization: event.target.value });
            }}
            aria-label={`Job experience ${props.index + 1} organization`}
          />
        </FormField>
        <FormField label='Start month'>
          <Input
            type='month'
            value={dateState.startDate}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              updateDateState({ startDate: event.target.value });
            }}
            aria-label={`Job experience ${props.index + 1} start month`}
          />
        </FormField>
        <FormField label='End month'>
          <div className='space-y-2'>
            <Input
              type='month'
              value={dateState.endDate}
              disabled={dateState.isCurrent}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                updateDateState({ endDate: event.target.value });
              }}
              aria-label={`Job experience ${props.index + 1} end month`}
            />
            <label className='flex items-center gap-2 text-xs text-gray-300'>
              <input
                type='checkbox'
                checked={dateState.isCurrent}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  updateDateState({ isCurrent: event.target.checked });
                }}
                aria-label={`Job experience ${props.index + 1} is current role`}
                className='size-3.5 rounded border-border bg-background'
              />
              Present
            </label>
          </div>
        </FormField>
        <FormField label='Timeline label'>
          <Input
            value={buildExperiencePeriod(dateState)}
            readOnly
            aria-label={`Job experience ${props.index + 1} timeline label`}
          />
        </FormField>
        <FormField label='Location / mode'>
          <Input
            value={props.experience.location ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              props.onUpdate({ location: event.target.value });
            }}
            placeholder='Szczecin, Poland | Remote'
            aria-label={`Job experience ${props.index + 1} location`}
          />
        </FormField>
        <FormField label='Description' className='md:col-span-2'>
          <Textarea
            value={props.experience.description ?? ''}
            rows={3}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
              props.onUpdate({ description: event.target.value });
            }}
            aria-label={`Job experience ${props.index + 1} description`}
          />
        </FormField>
        <FormField label='Highlights' className='md:col-span-2'>
          <Textarea
            value={joinLines(props.experience.highlights)}
            rows={5}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
              props.onUpdate({ highlights: parseLines(event.target.value) });
            }}
            placeholder='One bullet per line'
            aria-label={`Job experience ${props.index + 1} highlights`}
          />
        </FormField>
      </div>
    </div>
  );
}

function PersonProfileJobExperienceFields(): React.JSX.Element {
  const { personDraft } = useAdminFilemakerPersonEditPageStateContext();
  const { setPersonDraft } = useAdminFilemakerPersonEditPageActionsContext();
  const experiences = personDraft.profileJobExperience ?? [];

  const updateExperience = (
    index: number,
    patch: Partial<FilemakerPersonProfileJobExperience>
  ): void => {
    updateDraft(personDraft, setPersonDraft, {
      profileJobExperience: experiences.map(
        (
          experience: FilemakerPersonProfileJobExperience,
          currentIndex: number
        ): FilemakerPersonProfileJobExperience =>
          currentIndex === index ? { ...experience, ...patch } : experience
      ),
    });
  };

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-sm font-semibold text-white'>Job experience</h3>
          <p className='text-xs text-gray-500'>
            Used to generate the Professional Experience section in a new CV.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='gap-2'
          onClick={(): void => {
            updateDraft(personDraft, setPersonDraft, {
              profileJobExperience: [...experiences, emptyExperience()],
            });
          }}
        >
          <Plus className='size-3.5' />
          Add Experience
        </Button>
      </div>
      {experiences.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 p-3 text-xs text-gray-500'>
          No job experience entries yet.
        </div>
      ) : (
        experiences.map((experience: FilemakerPersonProfileJobExperience, index: number) => (
          <JobExperienceFields
            key={experience.id ?? index}
            experience={experience}
            index={index}
            onUpdate={(patch: Partial<FilemakerPersonProfileJobExperience>): void => {
              updateExperience(index, patch);
            }}
            onRemove={(): void => {
              updateDraft(personDraft, setPersonDraft, {
                profileJobExperience: experiences.filter(
                  (_entry: FilemakerPersonProfileJobExperience, currentIndex: number): boolean =>
                    currentIndex !== index
                ),
              });
            }}
          />
        ))
      )}
    </div>
  );
}

function EducationFields(props: {
  education: FilemakerPersonProfileEducation;
  index: number;
  onRemove: () => void;
  onUpdate: (patch: Partial<FilemakerPersonProfileEducation>) => void;
}): React.JSX.Element {
  return (
    <div className='rounded-md border border-border/60 bg-card/20 p-3'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <div className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
          Education {props.index + 1}
        </div>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-7 text-red-300'
          aria-label={`Remove education ${props.index + 1}`}
          onClick={props.onRemove}
        >
          <Trash2 className='size-3.5' />
        </Button>
      </div>
      <div className='grid gap-3 md:grid-cols-2'>
        <FormField label='Degree'>
          <Input
            value={props.education.degree}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              props.onUpdate({ degree: event.target.value });
            }}
            aria-label={`Education ${props.index + 1} degree`}
          />
        </FormField>
        <FormField label='Institution'>
          <Input
            value={props.education.institution}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              props.onUpdate({ institution: event.target.value });
            }}
            aria-label={`Education ${props.index + 1} institution`}
          />
        </FormField>
        <FormField label='Country of study'>
          <Input
            value={props.education.country ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              props.onUpdate({ country: event.target.value });
            }}
            placeholder='Poland'
            aria-label={`Education ${props.index + 1} country of study`}
          />
        </FormField>
        <FormField label='Period'>
          <Input
            value={props.education.period}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              props.onUpdate({ period: event.target.value });
            }}
            placeholder='2004 - 2005'
            aria-label={`Education ${props.index + 1} period`}
          />
        </FormField>
        <FormField label='Description' className='md:col-span-2'>
          <Textarea
            value={props.education.description ?? ''}
            rows={3}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
              props.onUpdate({ description: event.target.value });
            }}
            aria-label={`Education ${props.index + 1} description`}
          />
        </FormField>
      </div>
    </div>
  );
}

function PersonProfileEducationFields(): React.JSX.Element {
  const { personDraft } = useAdminFilemakerPersonEditPageStateContext();
  const { setPersonDraft } = useAdminFilemakerPersonEditPageActionsContext();
  const educationItems = personDraft.profileEducation ?? [];

  const updateEducation = (
    index: number,
    patch: Partial<FilemakerPersonProfileEducation>
  ): void => {
    updateDraft(personDraft, setPersonDraft, {
      profileEducation: educationItems.map(
        (
          education: FilemakerPersonProfileEducation,
          currentIndex: number
        ): FilemakerPersonProfileEducation =>
          currentIndex === index ? { ...education, ...patch } : education
      ),
    });
  };

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-sm font-semibold text-white'>Education</h3>
          <p className='text-xs text-gray-500'>
            Used to generate the Education section in a new CV.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='gap-2'
          onClick={(): void => {
            updateDraft(personDraft, setPersonDraft, {
              profileEducation: [...educationItems, emptyEducation()],
            });
          }}
        >
          <Plus className='size-3.5' />
          Add Education
        </Button>
      </div>
      {educationItems.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 p-3 text-xs text-gray-500'>
          No education entries yet.
        </div>
      ) : (
        educationItems.map((education: FilemakerPersonProfileEducation, index: number) => (
          <EducationFields
            key={education.id ?? index}
            education={education}
            index={index}
            onUpdate={(patch: Partial<FilemakerPersonProfileEducation>): void => {
              updateEducation(index, patch);
            }}
            onRemove={(): void => {
              updateDraft(personDraft, setPersonDraft, {
                profileEducation: educationItems.filter(
                  (_entry: FilemakerPersonProfileEducation, currentIndex: number): boolean =>
                    currentIndex !== index
                ),
              });
            }}
          />
        ))
      )}
    </div>
  );
}

export function PersonProfileCvSection(): React.JSX.Element {
  const { personDraft } = useAdminFilemakerPersonEditPageStateContext();
  const { setPersonDraft } = useAdminFilemakerPersonEditPageActionsContext();

  React.useEffect((): void => {
    if (!isMichalMatyniaDraft(personDraft)) return;
    if (
      hasArrayEntries(personDraft.profileJobExperience) &&
      hasArrayEntries(personDraft.profileEducation)
    ) {
      return;
    }
    setPersonDraft((current: Partial<FilemakerPerson>): Partial<FilemakerPerson> =>
      isMichalMatyniaDraft(current) ? mergeMissingReferenceCvProfile(current) : current
    );
  }, [
    personDraft.firstName,
    personDraft.lastName,
    personDraft.profileEducation,
    personDraft.profileJobExperience,
    setPersonDraft,
  ]);

  return (
    <FormSection title='Person Profile & CV' className='space-y-6 p-4'>
      <PersonProfileLinksAndCvFields />
      <PersonLanguageSkillFields />
      <PersonProfileJobExperienceFields />
      <PersonProfileEducationFields />
    </FormSection>
  );
}
