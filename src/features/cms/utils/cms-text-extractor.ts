import type { BlockInstance, Page, PageComponentInput } from '@/shared/contracts/cms';

/**
 * Maps CMS block types to the settings keys that contain human-readable text.
 * Derived from block-definitions-content.ts.
 */
const CMS_TEXT_SETTINGS_MAP: Record<string, string[]> = {
  Heading: ['headingText'],
  Text: ['textContent'],
  TextElement: ['textContent'],
  TextAtom: ['text'],
  TextAtomLetter: ['textContent'],
  Button: ['buttonLabel'],
  Input: ['inputPlaceholder'],
  Repeater: ['emptyMessage'],
};

const SEMANTIC_TEXT_MAX_LENGTH = 2000;
const MIN_TEXT_LENGTH = 20;

export type CmsSectionTextContent = {
  sectionId: string;
  sectionType: string;
  zone: string;
  texts: string[];
};

export type CmsPageTextContent = {
  pageId: string;
  pageName: string;
  seoTitle: string | null;
  seoDescription: string | null;
  slug: string | null;
  sections: CmsSectionTextContent[];
};

/**
 * Recursively extracts human-readable text from a CMS BlockInstance.
 */
export function extractBlockTexts(block: BlockInstance): string[] {
  const texts: string[] = [];
  const keys = CMS_TEXT_SETTINGS_MAP[block.type];

  if (keys) {
    for (const key of keys) {
      const value = block.settings[key];

      if (typeof value === 'string' && value.trim().length > 0) {
        texts.push(value.trim());
      }
    }
  }

  if (block.blocks) {
    for (const child of block.blocks) {
      texts.push(...extractBlockTexts(child));
    }
  }

  return texts;
}

/**
 * Extracts all human-readable text from a CMS page's component tree.
 */
export function extractCmsPageTextContent(page: Page): CmsPageTextContent {
  const sortedComponents = [...page.components].sort(
    (a: PageComponentInput, b: PageComponentInput) => a.order - b.order
  );

  const sections: CmsSectionTextContent[] = [];

  for (const component of sortedComponents) {
    const texts: string[] = [];

    for (const block of component.content.blocks) {
      texts.push(...extractBlockTexts(block));
    }

    if (texts.length > 0) {
      sections.push({
        sectionId: component.content.sectionId,
        sectionType: component.type,
        zone: component.content.zone,
        texts,
      });
    }
  }

  const defaultSlug = page.slugs?.[0]?.slug ?? null;

  return {
    pageId: page.id,
    pageName: page.name,
    seoTitle: page.seoTitle ?? null,
    seoDescription: page.seoDescription ?? null,
    slug: defaultSlug,
    sections,
  };
}

/**
 * Returns the total character count of all extracted text.
 */
export function getCmsPageTextLength(content: CmsPageTextContent): number {
  let length = 0;

  if (content.seoTitle) {
    length += content.seoTitle.length;
  }

  if (content.seoDescription) {
    length += content.seoDescription.length;
  }

  for (const section of content.sections) {
    for (const text of section.texts) {
      length += text.length;
    }
  }

  return length;
}

/**
 * Returns true if the page has enough text content to be worth indexing.
 */
export function hasMeaningfulTextContent(content: CmsPageTextContent): boolean {
  return getCmsPageTextLength(content) >= MIN_TEXT_LENGTH;
}

/**
 * Joins all extracted text into a single string suitable for embedding generation.
 * Capped at SEMANTIC_TEXT_MAX_LENGTH characters.
 */
export function buildCmsPageSemanticText(content: CmsPageTextContent): string {
  const parts: string[] = [];

  if (content.pageName) {
    parts.push(content.pageName);
  }

  if (content.seoTitle && content.seoTitle !== content.pageName) {
    parts.push(content.seoTitle);
  }

  if (content.seoDescription) {
    parts.push(content.seoDescription);
  }

  if (content.slug) {
    parts.push(content.slug);
  }

  for (const section of content.sections) {
    parts.push(...section.texts);
  }

  const joined = [...new Set(parts)].join(' ').trim();

  if (joined.length <= SEMANTIC_TEXT_MAX_LENGTH) {
    return joined;
  }

  return joined.slice(0, SEMANTIC_TEXT_MAX_LENGTH);
}

/**
 * Builds canonical text for hydration — includes all content with section grouping.
 */
export function buildCmsPageCanonicalText(content: CmsPageTextContent): string {
  const parts: string[] = [];

  if (content.seoTitle) {
    parts.push(content.seoTitle);
  }

  if (content.seoDescription) {
    parts.push(content.seoDescription);
  }

  for (const section of content.sections) {
    parts.push(section.texts.join(' '));
  }

  return parts.join('\n').trim();
}
