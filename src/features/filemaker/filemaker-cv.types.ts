import type { CvBlock, CvTechStackItem } from './components/cv-builder/cv-block-model';

export type FilemakerCvStatus = 'draft' | 'published' | 'archived';
export type FilemakerCvTemplate = 'classic';

export type FilemakerCv = {
  id: string;
  personId: string;
  personName: string;
  title: string;
  status: FilemakerCvStatus;
  template: FilemakerCvTemplate;
  bodyBlocks: CvBlock[] | null;
  bodyHtml: string | null;
  bodyText: string | null;
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
