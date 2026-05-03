import type { Document } from 'mongodb';

import type { CvBlock } from '../components/cv-builder/cv-block-model';
import type {
  FilemakerCvStatus,
  FilemakerCvTemplate,
} from '../filemaker-cv.types';

export const FILEMAKER_CVS_COLLECTION = 'filemaker_cvs';

export type FilemakerCvMongoDocument = Document & {
  _id: string;
  bodyBlocks?: CvBlock[] | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
  coreStrengths?: unknown;
  createdAt: string;
  experienceHighlightPatches?: unknown;
  highlightTechnologyTerms?: unknown;
  id: string;
  jobListingId?: unknown;
  personId: string;
  personName: string;
  professionalSummary?: unknown;
  selectedTechnicalEnvironment?: unknown;
  sourceCvRecordId?: unknown;
  sourceCvTitle?: unknown;
  status: FilemakerCvStatus;
  tailoringPatch?: unknown;
  tailoringScope?: unknown;
  template: FilemakerCvTemplate;
  title: string;
  updatedAt: string;
};

export type CreateMongoFilemakerCvInput = {
  bodyBlocks?: unknown;
  bodyHtml?: string | null;
  bodyText?: string | null;
  coreStrengths?: unknown;
  experienceHighlightPatches?: unknown;
  highlightTechnologyTerms?: unknown;
  jobListingId?: string | null;
  personId: string;
  personName: string;
  professionalSummary?: string | null;
  selectedTechnicalEnvironment?: unknown;
  sourceCvRecordId?: string | null;
  sourceCvTitle?: string | null;
  tailoringPatch?: unknown;
  tailoringScope?: unknown;
  title?: string | null;
};

export type UpdateMongoFilemakerCvInput = {
  bodyBlocks?: unknown;
  bodyHtml?: string | null;
  bodyText?: string | null;
  coreStrengths?: unknown;
  experienceHighlightPatches?: unknown;
  highlightTechnologyTerms?: unknown;
  jobListingId?: string | null;
  professionalSummary?: string | null;
  selectedTechnicalEnvironment?: unknown;
  sourceCvRecordId?: string | null;
  sourceCvTitle?: string | null;
  status?: FilemakerCvStatus;
  tailoringPatch?: unknown;
  tailoringScope?: unknown;
  template?: FilemakerCvTemplate;
  title?: string;
};
