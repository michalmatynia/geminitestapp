'use client';

/* eslint-disable complexity, max-lines, max-lines-per-function */

import React from 'react';

import { FormField } from '@/shared/ui/forms-and-actions.public';
import { Input, Textarea } from '@/shared/ui/primitives.public';

import type {
  CvBlock,
  CvColumnsBlock,
  CvCustomTextBlock,
  CvDividerBlock,
  CvEducationBlock,
  CvExperienceBlock,
  CvLanguagesBlock,
  CvProfileHeaderBlock,
  CvRowBlock,
  CvSectionBlock,
  CvSkillsBlock,
  CvSpacerBlock,
  CvStackBlock,
  CvSummaryBlock,
  CvTechStackBlock,
} from './cv-block-model';

interface EditorProps<TBlock extends CvBlock> {
  block: TBlock;
  onUpdate: (patch: Partial<TBlock>) => void;
}

const parseLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry.length > 0);

export function ProfileHeaderBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvProfileHeaderBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Name'>
        <Input
          value={block.name}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ name: event.target.value });
          }}
          aria-label='CV profile name'
          className='h-9'
        />
      </FormField>
      <FormField label='Headline'>
        <Input
          value={block.headline}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ headline: event.target.value });
          }}
          aria-label='CV headline'
          className='h-9'
        />
      </FormField>
      <FormField label='Email'>
        <Input
          value={block.email}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ email: event.target.value });
          }}
          aria-label='CV email'
          className='h-9'
        />
      </FormField>
      <FormField label='Phone'>
        <Input
          value={block.phone}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ phone: event.target.value });
          }}
          aria-label='CV phone'
          className='h-9'
        />
      </FormField>
      <FormField label='Location'>
        <Input
          value={block.location}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ location: event.target.value });
          }}
          aria-label='CV location'
          className='h-9'
        />
      </FormField>
      <FormField label='Website'>
        <Input
          value={block.website}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ website: event.target.value });
          }}
          aria-label='CV website'
          className='h-9'
        />
      </FormField>
      <FormField label='LinkedIn'>
        <Input
          value={block.linkedinUrl}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ linkedinUrl: event.target.value });
          }}
          aria-label='CV LinkedIn link'
          className='h-9'
        />
      </FormField>
      <FormField label='GitHub'>
        <Input
          value={block.githubUrl}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ githubUrl: event.target.value });
          }}
          aria-label='CV GitHub link'
          className='h-9'
        />
      </FormField>
    </div>
  );
}

export function SummaryBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvSummaryBlock>): React.JSX.Element {
  return (
    <FormField label='Summary'>
      <Textarea
        value={block.text}
        rows={5}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
          onUpdate({ text: event.target.value });
        }}
        aria-label='CV summary'
      />
    </FormField>
  );
}

export function ExperienceBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvExperienceBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Role'>
        <Input
          value={block.title}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ title: event.target.value });
          }}
          aria-label='CV experience role'
          className='h-9'
        />
      </FormField>
      <FormField label='Organization'>
        <Input
          value={block.organization}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ organization: event.target.value });
          }}
          aria-label='CV experience organization'
          className='h-9'
        />
      </FormField>
      <FormField label='Period' className='md:col-span-2'>
        <Input
          value={block.period}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ period: event.target.value });
          }}
          aria-label='CV experience period'
          className='h-9'
        />
      </FormField>
      <FormField label='Location / mode' className='md:col-span-2'>
        <Input
          value={block.location}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ location: event.target.value });
          }}
          aria-label='CV experience location'
          className='h-9'
        />
      </FormField>
      <FormField label='Description' className='md:col-span-2'>
        <Textarea
          value={block.description}
          rows={5}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            onUpdate({ description: event.target.value });
          }}
          aria-label='CV experience description'
        />
      </FormField>
      <FormField label='Highlights' className='md:col-span-2'>
        <Textarea
          value={block.highlights.join('\n')}
          rows={6}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            onUpdate({ highlights: parseLines(event.target.value) });
          }}
          aria-label='CV experience highlights'
        />
      </FormField>
    </div>
  );
}

export function EducationBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvEducationBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Institution'>
        <Input
          value={block.institution}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ institution: event.target.value });
          }}
          aria-label='CV education institution'
          className='h-9'
        />
      </FormField>
      <FormField label='Degree'>
        <Input
          value={block.degree}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ degree: event.target.value });
          }}
          aria-label='CV education degree'
          className='h-9'
        />
      </FormField>
      <FormField label='Period' className='md:col-span-2'>
        <Input
          value={block.period}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ period: event.target.value });
          }}
          aria-label='CV education period'
          className='h-9'
        />
      </FormField>
      <FormField label='Country of study' className='md:col-span-2'>
        <Input
          value={block.country}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ country: event.target.value });
          }}
          aria-label='CV education country of study'
          className='h-9'
        />
      </FormField>
      <FormField label='Description' className='md:col-span-2'>
        <Textarea
          value={block.description}
          rows={4}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            onUpdate({ description: event.target.value });
          }}
          aria-label='CV education description'
        />
      </FormField>
    </div>
  );
}

export function SkillsBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvSkillsBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3'>
      <FormField label='Label'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='CV skills label'
          className='h-9'
        />
      </FormField>
      <FormField label='Items'>
        <Textarea
          value={block.items.join('\n')}
          rows={6}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            onUpdate({ items: parseLines(event.target.value) });
          }}
          aria-label='CV skill items'
        />
      </FormField>
    </div>
  );
}

export function LanguagesBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvLanguagesBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3'>
      <FormField label='Label'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='CV languages label'
          className='h-9'
        />
      </FormField>
      <FormField label='Items'>
        <Textarea
          value={block.items
            .map((item) => typeof item === 'string' ? item : `${item.language} - ${item.level}/10`)
            .join('\n')}
          rows={5}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            onUpdate({ items: parseLines(event.target.value) });
          }}
          aria-label='CV language items'
        />
      </FormField>
    </div>
  );
}

const serializeTechStackItems = (items: CvTechStackBlock['items']): string =>
  items
    .map((item): string =>
      item.iconUrl.trim().length > 0 ? `${item.label} | ${item.iconUrl}` : item.label
    )
    .join('\n');

const parseTechStackItems = (value: string): CvTechStackBlock['items'] =>
  value
    .split(/\r?\n/)
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry.length > 0)
    .map((entry: string): CvTechStackBlock['items'][number] => {
      const [label = '', ...iconParts] = entry.split(/\s*\|\s*/);
      return {
        label: label.trim(),
        iconUrl: iconParts.join(' | ').trim(),
      };
    })
    .filter((item): boolean => item.label.length > 0);

export function TechStackBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvTechStackBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3'>
      <FormField label='Label'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='CV tech stack label'
          className='h-9'
        />
      </FormField>
      <FormField label='Items'>
        <Textarea
          value={serializeTechStackItems(block.items)}
          rows={6}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            onUpdate({ items: parseTechStackItems(event.target.value) });
          }}
          aria-label='CV tech stack items'
          placeholder='React | https://cdn.simpleicons.org/react/334155'
        />
      </FormField>
    </div>
  );
}

export function CustomTextBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvCustomTextBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3'>
      <FormField label='Label'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='CV custom text label'
          className='h-9'
        />
      </FormField>
      <FormField label='HTML'>
        <Textarea
          value={block.html}
          rows={6}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            onUpdate({ html: event.target.value });
          }}
          aria-label='CV custom text HTML'
        />
      </FormField>
    </div>
  );
}

export function DividerBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvDividerBlock>): React.JSX.Element {
  return (
    <FormField label='Divider colour'>
      <Input
        type='color'
        value={block.color}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          onUpdate({ color: event.target.value });
        }}
        aria-label='CV divider colour'
        className='h-9 w-20'
      />
    </FormField>
  );
}

export function SpacerBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvSpacerBlock>): React.JSX.Element {
  return (
    <FormField label='Height (px)'>
      <Input
        type='number'
        min={1}
        max={200}
        value={block.height}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          const parsed = Math.trunc(Number(event.target.value));
          if (!Number.isFinite(parsed) || parsed <= 0) return;
          onUpdate({ height: Math.min(parsed, 200) });
        }}
        aria-label='CV spacer height'
        className='h-9 w-24'
      />
    </FormField>
  );
}

export function SectionBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvSectionBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Label' className='md:col-span-2'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='CV section label'
          className='h-9'
        />
      </FormField>
      <FormField label='Background colour'>
        <Input
          type='color'
          value={block.background}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ background: event.target.value });
          }}
          aria-label='CV section background colour'
          className='h-9 w-20'
        />
      </FormField>
      <FormField label='Vertical padding (px)'>
        <Input
          type='number'
          min={0}
          max={96}
          value={block.paddingY}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ paddingY: Math.min(parsed, 96) });
          }}
          aria-label='CV section vertical padding'
          className='h-9 w-24'
        />
      </FormField>
      <FormField label='Horizontal padding (px)'>
        <Input
          type='number'
          min={0}
          max={96}
          value={block.paddingX}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ paddingX: Math.min(parsed, 96) });
          }}
          aria-label='CV section horizontal padding'
          className='h-9 w-24'
        />
      </FormField>
    </div>
  );
}

export function StackBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvStackBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Label'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='CV stack label'
          className='h-9'
        />
      </FormField>
      <FormField label='Gap (px)'>
        <Input
          type='number'
          min={0}
          max={64}
          value={block.gap}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ gap: Math.min(parsed, 64) });
          }}
          aria-label='CV stack gap'
          className='h-9 w-24'
        />
      </FormField>
    </div>
  );
}

export function ColumnsBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvColumnsBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Label'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='CV columns label'
          className='h-9'
        />
      </FormField>
      <FormField label='Gap (px)'>
        <Input
          type='number'
          min={0}
          max={64}
          value={block.gap}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ gap: Math.min(parsed, 64) });
          }}
          aria-label='CV columns gap'
          className='h-9 w-24'
        />
      </FormField>
    </div>
  );
}

export function RowBlockEditor({
  block,
  onUpdate,
}: EditorProps<CvRowBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Label'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='CV row label'
          className='h-9'
        />
      </FormField>
      <FormField label='Background colour'>
        <Input
          type='color'
          value={block.background}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ background: event.target.value });
          }}
          aria-label='CV row background colour'
          className='h-9 w-20'
        />
      </FormField>
      <FormField label='Vertical padding (px)'>
        <Input
          type='number'
          min={0}
          max={96}
          value={block.paddingY}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ paddingY: Math.min(parsed, 96) });
          }}
          aria-label='CV row vertical padding'
          className='h-9 w-24'
        />
      </FormField>
      <FormField label='Horizontal padding (px)'>
        <Input
          type='number'
          min={0}
          max={96}
          value={block.paddingX}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ paddingX: Math.min(parsed, 96) });
          }}
          aria-label='CV row horizontal padding'
          className='h-9 w-24'
        />
      </FormField>
    </div>
  );
}

export function CvBlockEditor({
  block,
  onUpdate,
}: {
  block: CvBlock;
  onUpdate: (updates: Partial<CvBlock>) => void;
}): React.JSX.Element {
  switch (block.kind) {
    case 'profileHeader':
      return <ProfileHeaderBlockEditor block={block} onUpdate={onUpdate} />;
    case 'summary':
      return <SummaryBlockEditor block={block} onUpdate={onUpdate} />;
    case 'experience':
      return <ExperienceBlockEditor block={block} onUpdate={onUpdate} />;
    case 'education':
      return <EducationBlockEditor block={block} onUpdate={onUpdate} />;
    case 'skills':
      return <SkillsBlockEditor block={block} onUpdate={onUpdate} />;
    case 'techStack':
      return <TechStackBlockEditor block={block} onUpdate={onUpdate} />;
    case 'languages':
      return <LanguagesBlockEditor block={block} onUpdate={onUpdate} />;
    case 'customText':
      return <CustomTextBlockEditor block={block} onUpdate={onUpdate} />;
    case 'divider':
      return <DividerBlockEditor block={block} onUpdate={onUpdate} />;
    case 'spacer':
      return <SpacerBlockEditor block={block} onUpdate={onUpdate} />;
    case 'section':
      return <SectionBlockEditor block={block} onUpdate={onUpdate} />;
    case 'stack':
      return <StackBlockEditor block={block} onUpdate={onUpdate} />;
    case 'columns':
      return <ColumnsBlockEditor block={block} onUpdate={onUpdate} />;
    case 'row':
      return <RowBlockEditor block={block} onUpdate={onUpdate} />;
  }
}
