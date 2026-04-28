import { describe, expect, it } from 'vitest';

import { compileCvBlocksToHtml, compileCvBlocksToPlainText } from '../components/cv-builder/compile-cv-blocks';
import type { CvSectionBlock } from '../components/cv-builder/cv-block-model';
import { buildDefaultFilemakerCvBlocks } from '../cv-defaults';

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
});
