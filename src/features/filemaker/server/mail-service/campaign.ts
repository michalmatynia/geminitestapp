import { readFilemakerCampaignSettingValue } from '../campaign-settings-store';
import {
  detectFilemakerCampaignReplyContext,
  recordFilemakerCampaignReply,
} from '../campaign-reply-detector';
import {
  filterFilemakerMailSuppressionEntries,
  recordFilemakerMailBounceSuppressions,
  recordFilemakerMailComplaintSuppressions,
} from '../campaign-suppression';

export const campaignService = {
  readSetting: readFilemakerCampaignSettingValue,
  detectReply: detectFilemakerCampaignReplyContext,
  recordReply: recordFilemakerCampaignReply,
  filterSuppressions: filterFilemakerMailSuppressionEntries,
  recordBounce: recordFilemakerMailBounceSuppressions,
  recordComplaint: recordFilemakerMailComplaintSuppressions,
};
