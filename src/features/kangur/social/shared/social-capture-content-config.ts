export type KangurSocialCapturePageSection =
  | 'full-viewport'
  | 'task-area'
  | 'score-panel'
  | 'instruction-panel'
  | 'controls-panel'
  | 'feedback-area';

export const KANGUR_SOCIAL_CAPTURE_PAGE_SECTIONS: ReadonlyArray<{
  id: KangurSocialCapturePageSection;
  label: string;
  description: string;
}> = [
  { id: 'full-viewport', label: 'Full viewport', description: 'Full-page screenshot' },
  { id: 'task-area', label: 'Task area', description: 'Main game or task canvas' },
  { id: 'score-panel', label: 'Score panel', description: 'Score and progress display' },
  { id: 'instruction-panel', label: 'Instructions', description: 'Lesson instructions panel' },
  { id: 'controls-panel', label: 'Controls', description: 'Navigation controls bar' },
  { id: 'feedback-area', label: 'Feedback area', description: 'Result and feedback overlay' },
] as const;

/** CSS selector for each capturable page section. null = full-page screenshot. */
export const KANGUR_SOCIAL_SECTION_SELECTORS: Readonly<
  Record<KangurSocialCapturePageSection, string | null>
> = {
  'full-viewport': null,
  'task-area': '[data-capture="task-area"]',
  'score-panel': '[data-capture="score-panel"]',
  'instruction-panel': '[data-capture="instruction-panel"]',
  'controls-panel': '[data-capture="controls-panel"]',
  'feedback-area': '[data-capture="feedback-area"]',
};

export const DEFAULT_CAPTURE_SECTIONS: KangurSocialCapturePageSection[] = ['full-viewport'];

/** Per-slide capture configuration. A slide is uniquely identified by componentId + sectionId + subsectionId. */
export type KangurSocialSlideCapture = {
  componentId: string;
  sectionId: string;
  subsectionId: string | null;
  sections: KangurSocialCapturePageSection[];
  /** When true the pipeline skips this slide entirely. */
  disabled?: boolean;
};

export type KangurSocialCaptureContentConfig = {
  slides: KangurSocialSlideCapture[];
};

export const DEFAULT_KANGUR_SOCIAL_CAPTURE_CONTENT_CONFIG: KangurSocialCaptureContentConfig = {
  slides: [],
};

/** Stable string key that uniquely identifies a slide position within the tree. */
export const buildSlideKey = (
  componentId: string,
  sectionId: string,
  subsectionId: string | null
): string => `${componentId}:${sectionId}:${subsectionId ?? '_'}`;

const isCapturePageSection = (value: unknown): value is KangurSocialCapturePageSection => {
  const valid = new Set<string>([
    'full-viewport',
    'task-area',
    'score-panel',
    'instruction-panel',
    'controls-panel',
    'feedback-area',
  ]);
  return typeof value === 'string' && valid.has(value);
};

const normalizeSlide = (raw: unknown): KangurSocialSlideCapture | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const componentId = typeof obj['componentId'] === 'string' ? obj['componentId'].trim() : '';
  const sectionId = typeof obj['sectionId'] === 'string' ? obj['sectionId'].trim() : '';
  if (!componentId || !sectionId) return null;
  const subsectionId =
    typeof obj['subsectionId'] === 'string' ? obj['subsectionId'].trim() || null : null;
  const sections = Array.isArray(obj['sections'])
    ? (obj['sections'] as unknown[]).filter(isCapturePageSection)
    : DEFAULT_CAPTURE_SECTIONS;
  const disabled = obj['disabled'] === true;
  return {
    componentId,
    sectionId,
    subsectionId,
    sections: sections.length > 0 ? sections : DEFAULT_CAPTURE_SECTIONS,
    ...(disabled ? { disabled } : {}),
  };
};

export const normalizeCaptureContentConfig = (
  raw: unknown
): KangurSocialCaptureContentConfig => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_KANGUR_SOCIAL_CAPTURE_CONTENT_CONFIG };
  }
  const obj = raw as Record<string, unknown>;
  const slides = Array.isArray(obj['slides'])
    ? (obj['slides'] as unknown[]).flatMap((entry) => {
        const slide = normalizeSlide(entry);
        return slide ? [slide] : [];
      })
    : [];
  return { slides };
};
