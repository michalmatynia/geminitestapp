import { describe, expect, it } from 'vitest';

import {
  createCvBlock,
  type CvBlock,
  type CvExperienceBlock,
  type CvSectionBlock,
  type CvStackBlock,
} from '../cv-block-model';
import { duplicateCvBlock } from '../cv-block-mutations';

describe('duplicateCvBlock', () => {
  it('duplicates a leaf next to the selected block', () => {
    const experience = createCvBlock('experience', {
      id: 'experience',
      title: 'Agentic Engineer',
      highlights: ['Built AI tutor workflows.'],
    }) as CvExperienceBlock;
    const stack = createCvBlock('stack', {
      id: 'stack',
      children: [experience],
    }) as CvStackBlock;
    const section = createCvBlock('section', {
      id: 'section',
      children: [stack],
    }) as CvSectionBlock;

    const result = duplicateCvBlock([section], 'experience');
    const duplicatedId = result.duplicatedId;

    expect(duplicatedId).toBe('experience-copy');
    const nextSection = result.blocks[0];
    if (!nextSection || nextSection.kind !== 'section') throw new Error('Expected section');
    const nextStack = nextSection.children[0];
    if (!nextStack || nextStack.kind !== 'stack') throw new Error('Expected stack');
    expect(nextStack.children.map((child) => child.id)).toEqual([
      'experience',
      'experience-copy',
    ]);
    const duplicated = nextStack.children[1];
    if (!duplicated || duplicated.kind !== 'experience') throw new Error('Expected experience');
    expect(duplicated.title).toBe('Agentic Engineer');
    expect(duplicated.highlights).toEqual(['Built AI tutor workflows.']);
  });

  it('duplicates a container with fresh child ids', () => {
    const stack = createCvBlock('stack', {
      id: 'stack',
      children: [
        createCvBlock('summary', {
          id: 'summary',
          text: 'Engineer building AI products.',
        }),
      ],
    }) as CvStackBlock;
    const tree: CvBlock[] = [
      createCvBlock('section', {
        id: 'section',
        children: [stack],
      }) as CvSectionBlock,
    ];

    const result = duplicateCvBlock(tree, 'stack');
    const section = result.blocks[0];
    if (!section || section.kind !== 'section') throw new Error('Expected section');

    expect(result.duplicatedId).toBe('stack-copy');
    expect(section.children.map((child) => child.id)).toEqual(['stack', 'stack-copy']);
    const duplicatedStack = section.children[1];
    if (!duplicatedStack || duplicatedStack.kind !== 'stack') throw new Error('Expected stack');
    expect(duplicatedStack.children.map((child) => child.id)).toEqual(['summary-copy']);
  });

  it('returns the original tree when the target is missing', () => {
    const tree = [createCvBlock('section', { id: 'section' })];

    const result = duplicateCvBlock(tree, 'missing');

    expect(result.blocks).toBe(tree);
    expect(result.duplicatedId).toBeNull();
  });
});
