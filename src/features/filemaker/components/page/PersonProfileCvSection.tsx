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
  location: '',
  description: '',
  highlights: [],
});

const emptyEducation = (): FilemakerPersonProfileEducation => ({
  id: createProfileEntryId('education'),
  degree: '',
  institution: '',
  period: '',
  description: '',
});

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

function JobExperienceFields(props: {
  experience: FilemakerPersonProfileJobExperience;
  index: number;
  onRemove: () => void;
  onUpdate: (patch: Partial<FilemakerPersonProfileJobExperience>) => void;
}): React.JSX.Element {
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
        <FormField label='Period'>
          <Input
            value={props.experience.period}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              props.onUpdate({ period: event.target.value });
            }}
            placeholder='Sep 2025 - Present'
            aria-label={`Job experience ${props.index + 1} period`}
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
        <FormField label='Period' className='md:col-span-2'>
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
  return (
    <FormSection title='Person Profile & CV' className='space-y-6 p-4'>
      <PersonProfileLinksAndCvFields />
      <PersonProfileJobExperienceFields />
      <PersonProfileEducationFields />
    </FormSection>
  );
}
