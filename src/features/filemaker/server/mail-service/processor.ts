import {
  isLikelyFilemakerMailBounceMessage,
  isLikelyFilemakerMailComplaintMessage,
  parseFilemakerMailComplaintReport,
  parseFilemakerMailDsnReport,
} from '../mail/mail-dsn';
import { parseMailSource } from '../mail/mail-processor';

export const mailProcessor = {
  parseSource: parseMailSource,
  isBounce: isLikelyFilemakerMailBounceMessage,
  isComplaint: isLikelyFilemakerMailComplaintMessage,
  parseComplaintReport: parseFilemakerMailComplaintReport,
  parseDsnReport: parseFilemakerMailDsnReport,
};
