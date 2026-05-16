import type { 
  FilemakerDatabase,
  FilemakerJobListing,
  FilemakerOrganization,
} from '../../../types';
import type { FilemakerJobApplicationSettings } from '../../../filemaker-job-application-settings';
import type { JobApplicationRunEntry } from '../JobApplicationPreparationModal';

export type JobApplicationPreparationModalProps = {
  initialJobListingId: string | null;
  filemakerDatabase: FilemakerDatabase;
  isOpen: boolean;
  isJobApplicationSettingsLoading?: boolean;
  jobListings: FilemakerJobListing[];
  jobApplicationSettings: FilemakerJobApplicationSettings;
  onClose: () => void;
  onCreated?: () => void;
  onRunEntryChange?: (entry: JobApplicationRunEntry) => void;
  organization: FilemakerOrganization;
  runEntries?: JobApplicationRunEntry[];
};

export type FilemakerPersonOptionRecord = {
  cvCoreStrengths?: unknown;
  cvHeadline?: unknown;
  cvProfessionalSummary?: unknown;
  firstName?: unknown;
  fullName?: unknown;
  id?: unknown;
  lastName?: unknown;
  profileEducation?: unknown;
  profileJobExperience?: unknown;
};
