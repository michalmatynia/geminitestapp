import { isCvLeafBlock } from '../components/cv-builder/cv-block-model';
import type {
  CvBlock,
  CvColumnsBlock,
  CvExperienceBlock,
  CvLeafBlock,
  CvRowBlock,
  CvSectionBlock,
  CvSkillsBlock,
  CvStackBlock,
  CvSummaryBlock,
  CvTechStackBlock,
  CvTechStackItem,
} from '../components/cv-builder/cv-block-model';
import type {
  FilemakerCvExperienceHighlightPatch,
  FilemakerCvTailoringPatch,
} from '../filemaker-cv.types';

const normalizePatchKey = (value: string | null | undefined): string =>
  (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż]+/gi, ' ')
    .trim();

const keyMatches = (left: string | null | undefined, right: string | null | undefined): boolean => {
  const normalizedLeft = normalizePatchKey(left);
  const normalizedRight = normalizePatchKey(right);
  if (normalizedLeft.length === 0 || normalizedRight.length === 0) return false;
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
};

const findTechnologyTerm = (label: string, terms: CvTechStackItem[]): CvTechStackItem | null =>
  terms.find((term: CvTechStackItem): boolean => {
    const aliases = Array.isArray(term.aliases) ? term.aliases : [];
    const candidates = [term.label, term.normalizedLabel, ...aliases];
    return candidates.some((candidate: string | undefined): boolean => keyMatches(candidate, label));
  }) ?? null;

const toTechStackItems = (
  labels: string[],
  highlightTechnologyTerms: CvTechStackItem[]
): CvTechStackItem[] =>
  labels.map((label: string): CvTechStackItem => {
    const matched = findTechnologyTerm(label, highlightTechnologyTerms);
    return matched ?? { label, iconUrl: '' };
  });

const isCoreStrengthsBlock = (block: CvSkillsBlock): boolean =>
  keyMatches(block.label, 'Core Strengths') ||
  keyMatches(block.label, 'Strengths') ||
  keyMatches(block.id, 'skills');

const isSelectedTechnicalEnvironmentBlock = (block: CvTechStackBlock): boolean =>
  keyMatches(block.label, 'Selected Technical Environment') ||
  keyMatches(block.label, 'Technical Environment') ||
  keyMatches(block.label, 'Tech stack') ||
  keyMatches(block.id, 'tech');

const joinNonEmpty = (values: string[]): string =>
  values.filter((value: string): boolean => value.trim().length > 0).join(' | ');

const experiencePatchMatchesBlock = (
  patch: FilemakerCvExperienceHighlightPatch,
  block: CvExperienceBlock
): boolean => {
  const roleCompany = joinNonEmpty([block.title, block.organization]);
  return (
    keyMatches(patch.experienceId, block.id) ||
    keyMatches(patch.experienceKey, block.id) ||
    keyMatches(patch.experienceTitle, block.title) ||
    keyMatches(patch.experienceTitle, roleCompany) ||
    keyMatches(patch.role, block.title) ||
    keyMatches(patch.company, block.organization) ||
    keyMatches(patch.experienceKey, roleCompany)
  );
};

const findExperiencePatch = (
  block: CvExperienceBlock,
  tailoringPatch: FilemakerCvTailoringPatch
): FilemakerCvExperienceHighlightPatch | null =>
  tailoringPatch.experienceHighlightPatches.find(
    (entry: FilemakerCvExperienceHighlightPatch): boolean => experiencePatchMatchesBlock(entry, block)
  ) ?? null;

const applySummaryPatch = (
  block: CvSummaryBlock,
  tailoringPatch: FilemakerCvTailoringPatch
): CvSummaryBlock => {
  if (tailoringPatch.professionalSummary === null) return block;
  return { ...block, text: tailoringPatch.professionalSummary } satisfies CvSummaryBlock;
};

const applySkillsPatch = (
  block: CvSkillsBlock,
  tailoringPatch: FilemakerCvTailoringPatch
): CvSkillsBlock => {
  if (tailoringPatch.coreStrengths.length === 0) return block;
  if (!isCoreStrengthsBlock(block)) return block;
  return { ...block, items: tailoringPatch.coreStrengths } satisfies CvSkillsBlock;
};

const applyTechStackPatch = (
  block: CvTechStackBlock,
  tailoringPatch: FilemakerCvTailoringPatch,
  highlightTechnologyTerms: CvTechStackItem[]
): CvTechStackBlock => {
  if (tailoringPatch.selectedTechnicalEnvironment.length === 0) return block;
  if (!isSelectedTechnicalEnvironmentBlock(block)) return block;
  return {
    ...block,
    items: toTechStackItems(tailoringPatch.selectedTechnicalEnvironment, highlightTechnologyTerms),
  } satisfies CvTechStackBlock;
};

const applyExperiencePatch = (
  block: CvExperienceBlock,
  tailoringPatch: FilemakerCvTailoringPatch
): CvExperienceBlock => {
  const patch = findExperiencePatch(block, tailoringPatch);
  if (patch === null) return block;
  return { ...block, highlights: patch.highlights } satisfies CvExperienceBlock;
};

const applyTailoringPatchToLeafBlock = (
  block: CvLeafBlock,
  tailoringPatch: FilemakerCvTailoringPatch,
  highlightTechnologyTerms: CvTechStackItem[]
): CvLeafBlock => {
  switch (block.kind) {
    case 'summary':
      return applySummaryPatch(block, tailoringPatch);
    case 'skills':
      return applySkillsPatch(block, tailoringPatch);
    case 'techStack':
      return applyTechStackPatch(block, tailoringPatch, highlightTechnologyTerms);
    case 'experience':
      return applyExperiencePatch(block, tailoringPatch);
    default:
      return block;
  }
};

const isCvRowBlock = (block: CvBlock): block is CvRowBlock => block.kind === 'row';

const applyTailoringPatchToLeafBlocks = (
  blocks: CvLeafBlock[],
  tailoringPatch: FilemakerCvTailoringPatch,
  highlightTechnologyTerms: CvTechStackItem[]
): CvLeafBlock[] =>
  applyTailoringPatchToCvBlocks(blocks, tailoringPatch, highlightTechnologyTerms).filter(isCvLeafBlock);

const applyTailoringPatchToRowBlocks = (
  blocks: CvRowBlock[],
  tailoringPatch: FilemakerCvTailoringPatch,
  highlightTechnologyTerms: CvTechStackItem[]
): CvRowBlock[] =>
  applyTailoringPatchToCvBlocks(blocks, tailoringPatch, highlightTechnologyTerms).filter(isCvRowBlock);

const applyTailoringPatchToContainerBlock = (
  block: Exclude<CvBlock, CvLeafBlock>,
  tailoringPatch: FilemakerCvTailoringPatch,
  highlightTechnologyTerms: CvTechStackItem[]
): CvBlock => {
  if (block.kind === 'section') {
    return {
      ...block,
      children: applyTailoringPatchToCvBlocks(block.children, tailoringPatch, highlightTechnologyTerms),
    } satisfies CvSectionBlock;
  }
  if (block.kind === 'stack') {
    return {
      ...block,
      children: applyTailoringPatchToLeafBlocks(block.children, tailoringPatch, highlightTechnologyTerms),
    } satisfies CvStackBlock;
  }
  if (block.kind === 'columns') {
    return {
      ...block,
      children: applyTailoringPatchToRowBlocks(block.children, tailoringPatch, highlightTechnologyTerms),
    } satisfies CvColumnsBlock;
  }
  return {
    ...block,
    children: applyTailoringPatchToLeafBlocks(block.children, tailoringPatch, highlightTechnologyTerms),
  } satisfies CvRowBlock;
};

export const applyTailoringPatchToCvBlocks = (
  blocks: CvBlock[],
  tailoringPatch: FilemakerCvTailoringPatch | null,
  highlightTechnologyTerms: CvTechStackItem[]
): CvBlock[] => {
  if (tailoringPatch === null) return blocks;
  return blocks.map((block: CvBlock): CvBlock => {
    if (isCvLeafBlock(block)) {
      return applyTailoringPatchToLeafBlock(block, tailoringPatch, highlightTechnologyTerms);
    }
    return applyTailoringPatchToContainerBlock(block, tailoringPatch, highlightTechnologyTerms);
  });
};
