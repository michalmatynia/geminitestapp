import type { CvBlock, CvTechStackItem } from './components/cv-builder/cv-block-model';

export type FilemakerCvStatus = 'draft' | 'published' | 'archived';
export type FilemakerCvTemplate = 'classic';

export type FilemakerCvExperienceHighlightPatch = {
  experienceKey: string;
  experienceId?: string | null;
  experienceTitle?: string | null;
  company?: string | null;
  role?: string | null;
  highlights: string[];
};

export type FilemakerCvTailoringScope = {
  allowedSections: string[];
  canonicalPatchField?: string | null;
  lockedFieldsPreserved: boolean;
  renderedBodyMode?: string | null;
};

export type FilemakerCvTailoringPatch = {
  professionalSummary: string | null;
  coreStrengths: string[];
  selectedTechnicalEnvironment: string[];
  experienceHighlightPatches: FilemakerCvExperienceHighlightPatch[];
};

export type FilemakerCv = {
  id: string;
  personId: string;
  personName: string;
  title: string;
  status: FilemakerCvStatus;
  template: FilemakerCvTemplate;
  sourceCvRecordId?: string | null;
  sourceCvTitle?: string | null;
  bodyBlocksEditable?: boolean;
  canonicalEditMode?: 'bodyBlocks' | 'tailoringPatch';
  bodyBlocks: CvBlock[] | null;
  bodyHtml: string | null;
  bodyText: string | null;
  professionalSummary?: string | null;
  coreStrengths?: string[];
  selectedTechnicalEnvironment?: string[];
  experienceHighlightPatches?: FilemakerCvExperienceHighlightPatch[];
  tailoringPatch?: FilemakerCvTailoringPatch | null;
  tailoringScope?: FilemakerCvTailoringScope | null;
  highlightTechnologyTerms?: CvTechStackItem[];
  jobListingId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FilemakerCvListResponse = {
  cvs: FilemakerCv[];
};

export type FilemakerCvResponse = {
  cv: FilemakerCv;
};
