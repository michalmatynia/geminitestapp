export type FilemakerJobApplicationStatus =
  | 'draft'
  | 'ready'
  | 'applied'
  | 'rejected'
  | 'archived';

export type FilemakerJobApplicationTailoredCv = {
  bodyMarkdown: string | null;
  bodyText: string | null;
  educationHighlights: string[];
  experienceHighlights: string[];
  preferencesMatch: string[];
  professionalSummary: string | null;
  skills: string[];
  title: string | null;
};

export type FilemakerJobApplicationCoverLetter = {
  bodyMarkdown: string | null;
  subject: string | null;
};

export type FilemakerJobApplication = {
  id: string;
  status: FilemakerJobApplicationStatus;
  personId: string;
  personName: string | null;
  organizationId: string;
  organizationName: string | null;
  jobListingId: string;
  jobTitle: string | null;
  integrationId: string | null;
  integrationSlug: string | null;
  connectionId: string | null;
  tailoredCvId: string | null;
  tailoredCv: FilemakerJobApplicationTailoredCv | null;
  coverLetter: FilemakerJobApplicationCoverLetter | null;
  applicationNotes: string[];
  missingInformation: string[];
  confidence: number | null;
  source: string | null;
  sourceEntityId: string | null;
  sourceApplicationContext: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type FilemakerJobApplicationListResponse = {
  applications: FilemakerJobApplication[];
};

export type FilemakerJobApplicationResponse = {
  application: FilemakerJobApplication;
};
