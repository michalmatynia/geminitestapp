export type FilemakerJobApplicationStatus =
  | 'draft'
  | 'ready'
  | 'applied'
  | 'rejected'
  | 'archived';

export type FilemakerJobApplicationArtifactKind =
  | 'application_email'
  | 'cover_letter'
  | 'tailored_cv';

export type FilemakerJobApplicationExperienceHighlightPatch = {
  experienceKey?: string | null;
  experienceId: string | null;
  experienceTitle: string | null;
  company?: string | null;
  role?: string | null;
  highlights: string[];
};

export type FilemakerJobApplicationTailoringScope = {
  allowedSections: string[];
  canonicalPatchField?: string | null;
  lockedFieldsPreserved: boolean | null;
  renderedBodyMode?: string | null;
};

export type FilemakerJobApplicationTailoringPatch = {
  professionalSummary: string | null;
  coreStrengths: string[];
  selectedTechnicalEnvironment: string[];
  experienceHighlightPatches: FilemakerJobApplicationExperienceHighlightPatch[];
};

export type FilemakerJobApplicationTailoredCv = {
  bodyMarkdown: string | null;
  bodyText: string | null;
  coreStrengths?: string[];
  educationHighlights: string[];
  experienceHighlightPatches?: FilemakerJobApplicationExperienceHighlightPatch[];
  experienceHighlights: string[];
  preferencesMatch: string[];
  professionalSummary: string | null;
  selectedTechnicalEnvironment?: string[];
  skills: string[];
  sourceCvRecordId?: string | null;
  sourceCvTitle?: string | null;
  tailoringPatch?: FilemakerJobApplicationTailoringPatch | null;
  tailoringScope?: FilemakerJobApplicationTailoringScope | null;
  title: string | null;
};

export type FilemakerJobApplicationCoverLetter = {
  bodyMarkdown: string | null;
  subject: string | null;
};

export type FilemakerJobApplicationEmail = {
  bodyMarkdown: string | null;
  bodyText: string | null;
  subject: string | null;
};

export type FilemakerJobApplicationArtifactVersion = {
  id: string;
  applicationNotes: string[];
  confidence: number | null;
  createdAt: string | null;
  kind: FilemakerJobApplicationArtifactKind;
  linkedRecordId: string | null;
  missingInformation: string[];
  payload: Record<string, unknown> | null;
  sourceRunId: string | null;
  version: number | null;
};

export type FilemakerJobApplicationArtifactVersionSet = {
  applicationEmail: FilemakerJobApplicationArtifactVersion[];
  coverLetter: FilemakerJobApplicationArtifactVersion[];
  tailoredCv: FilemakerJobApplicationArtifactVersion[];
};

export type FilemakerJobApplicationActiveArtifacts = {
  applicationEmailVersionId: string | null;
  coverLetterVersionId: string | null;
  tailoredCvVersionId: string | null;
};

export type FilemakerJobApplicationApplyRunStatus =
  | 'queued'
  | 'running'
  | 'auth_required'
  | 'awaiting_review'
  | 'submitted'
  | 'failed'
  | 'canceled';

export type FilemakerJobApplicationApplyRunMode = 'review' | 'submit';

export type FilemakerJobApplicationApplyRunStepStatus = 'pending' | 'ok' | 'failed';

export type FilemakerJobApplicationApplyRunStep = {
  id: string;
  label: string;
  status: FilemakerJobApplicationApplyRunStepStatus;
  detail: string;
  createdAt: string;
};

export type FilemakerJobApplicationApplyRunArtifacts = {
  applicationEmailVersionId: string | null;
  coverLetterVersionId: string | null;
  tailoredCvVersionId: string | null;
};

export type FilemakerJobApplicationApplyRun = {
  id: string;
  applicationId: string;
  organizationId: string;
  personId: string;
  jobListingId: string;
  integrationId: string | null;
  integrationSlug: string | null;
  connectionId: string | null;
  sourceUrl: string | null;
  mode: FilemakerJobApplicationApplyRunMode;
  status: FilemakerJobApplicationApplyRunStatus;
  artifactVersionIds: FilemakerJobApplicationApplyRunArtifacts;
  confirmationUrl: string | null;
  error: string | null;
  steps: FilemakerJobApplicationApplyRunStep[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type FilemakerJobApplication = {
  id: string;
  activeArtifacts?: FilemakerJobApplicationActiveArtifacts | null;
  artifactKind?: FilemakerJobApplicationArtifactKind | null;
  artifactVersionCreatedAt?: string | null;
  artifactVersionId?: string | null;
  artifactVersionNumber?: number | null;
  artifactVersions?: FilemakerJobApplicationArtifactVersionSet | null;
  persistedArtifactVersions?: FilemakerJobApplicationArtifactVersionSet | null;
  canonicalApplicationKey?: string | null;
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
  applicationEmail: FilemakerJobApplicationEmail | null;
  applicationNotes: string[];
  missingInformation: string[];
  confidence: number | null;
  source: string | null;
  sourceEntityId: string | null;
  sourceApplicationContext: Record<string, unknown> | null;
  storageApplicationId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FilemakerJobApplicationListResponse = {
  applications: FilemakerJobApplication[];
};

export type FilemakerJobApplicationResponse = {
  application: FilemakerJobApplication;
};

export type FilemakerJobApplicationApplyRunResponse = {
  run: FilemakerJobApplicationApplyRun | null;
};
