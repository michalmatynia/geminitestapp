import { describe, expect, it } from 'vitest';

import { compileCvBlocksToHtml, compileCvBlocksToPlainText } from '../components/cv-builder/compile-cv-blocks';
import type { CvBlock, CvSectionBlock, CvTechStackBlock } from '../components/cv-builder/cv-block-model';
import { buildDefaultFilemakerCvBlocks } from '../cv-defaults';
import type { FilemakerLexiconTerm } from '../types';

const lexiconTechnologyTerm = (id: string, label: string): FilemakerLexiconTerm => ({
  id,
  label,
  normalizedLabel: label.toLowerCase(),
  typeKey: 'technology',
  category: 'technology',
  occurrenceCount: 1,
  createdAt: '2026-04-29T00:00:00.000Z',
  updatedAt: '2026-04-29T00:00:00.000Z',
});

const findTechStack = (blocks: CvBlock[]): CvTechStackBlock | null => {
  for (const block of blocks) {
    if (block.kind === 'techStack') return block;
    if ('children' in block) {
      const match = findTechStack(block.children as CvBlock[]);
      if (match) return match;
    }
  }
  return null;
};

describe('buildDefaultFilemakerCvBlocks', () => {
  it('builds a CV from person profile and CV-specific fields', () => {
    const blocks = buildDefaultFilemakerCvBlocks({
      emails: [
        {
          id: 'email-1',
          email: 'ada@example.com',
          status: 'active',
          createdAt: '2026-04-28T00:00:00.000Z',
          updatedAt: '2026-04-28T00:00:00.000Z',
        },
      ],
      person: {
        city: 'Szczecin',
        country: 'Poland',
        cvCoreStrengths: ['AI products', 'Integration engineering'],
        cvProfessionalSummary: 'Engineer building AI products and integrations.',
        cvSelectedTechnicalEnvironment: ['Next.js, React, TypeScript', 'MongoDB, Redis, BullMQ'],
        firstName: 'Ada',
        githubUrl: 'https://github.com/ada',
        lastName: 'Lovelace',
        linkedinUrl: 'https://linkedin.com/in/ada',
        phoneNumbers: ['+48 123 456 789'],
        profileEducation: [
          {
            degree: 'Master of Computing',
            institution: 'Analytical Engine University',
            period: '1842 - 1843',
          },
        ],
        profileJobExperience: [
          {
            highlights: ['Led end-to-end product delivery.', 'Built reliable automation.'],
            location: 'Remote',
            organization: 'StudiQ',
            period: 'Sep 2025 - Present',
            title: 'Agentic Engineer',
          },
        ],
      },
    });

    const plain = compileCvBlocksToPlainText(blocks);
    const html = compileCvBlocksToHtml(blocks);
    const generatedSections = blocks.filter(
      (block): block is CvSectionBlock => block.kind === 'section'
    );

    expect(plain).toContain('Professional Summary');
    expect(plain).toContain('Core Strengths');
    expect(plain).toContain('Selected Technical Environment');
    expect(plain).toContain('Professional Experience');
    expect(plain).toContain('Agentic Engineer');
    expect(plain).toContain('Education');
    expect(plain).toContain('Master of Computing');
    expect(html).toContain('href="https://linkedin.com/in/ada"');
    expect(html).toContain('href="https://github.com/ada"');
    expect(
      generatedSections.every((section) => section.paddingX === 0 && section.paddingY === 0)
    ).toBe(true);
  });

  it('adds only validated and mentioned lexicon technologies to the selected tech stack', () => {
    const blocks = buildDefaultFilemakerCvBlocks({
      lexiconTerms: [
        lexiconTechnologyTerm('term-ai', 'AI'),
        lexiconTechnologyTerm('term-docker', 'Docker'),
        lexiconTechnologyTerm('term-react', 'React'),
        lexiconTechnologyTerm('term-typescript', 'TypeScript'),
      ],
      person: {
        city: '',
        country: '',
        cvCoreStrengths: ['React application delivery'],
        cvProfessionalSummary: 'Builds marketplace products with TypeScript.',
        cvSelectedTechnicalEnvironment: [
          'AI products, React applications, and educational technology',
        ],
        firstName: 'Ada',
        githubUrl: '',
        languageSkills: [],
        lastName: 'Lovelace',
        linkedinUrl: '',
        phoneNumbers: [],
        profileEducation: [],
        profileJobExperience: [],
      },
    });

    const techStack = findTechStack(blocks);
    expect(techStack?.items.map((item) => item.label)).toEqual(['TypeScript', 'React']);
    expect(techStack?.items.map((item) => item.lexiconTermId)).toEqual([
      'term-typescript',
      'term-react',
    ]);
  });
});
