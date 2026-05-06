import {
  detectFilemakerCampaignReplyContext,
  recordFilemakerCampaignReply,
} from '../campaign-reply-detector';

export const campaignReplyService = {
  detectContext: detectFilemakerCampaignReplyContext,
  recordReply: recordFilemakerCampaignReply,
};
