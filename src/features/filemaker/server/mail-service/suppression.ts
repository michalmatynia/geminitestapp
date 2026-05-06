import {
  filterFilemakerMailSuppressionEntries,
  recordFilemakerMailBounceSuppressions,
  recordFilemakerMailComplaintSuppressions,
} from '../campaign-suppression';

export const suppressionService = {
  filterEntries: filterFilemakerMailSuppressionEntries,
  recordBounce: recordFilemakerMailBounceSuppressions,
  recordComplaint: recordFilemakerMailComplaintSuppressions,
};
