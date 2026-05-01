import type { FilemakerMailDmarcAlignmentWarning } from '../../mail-utils';

export const DMARC_WARNING_LABELS: Record<FilemakerMailDmarcAlignmentWarning, string> = {
  dkim_disabled:
    'DKIM is not configured. Mail sent from this account will not be signed — large receivers may flag it as unauthenticated.',
  dkim_partially_configured:
    'DKIM is partially configured. Domain, selector, and private key are all required for signing to work.',
  dkim_domain_misaligned:
    'DKIM domain doesn\'t share the From-address organisational domain — DMARC alignment will fail and receivers will treat the message as unsigned.',
  reply_to_domain_misaligned:
    'Reply-To address is on a different organisational domain than From — engagement signal harm and some receivers downgrade reputation.',
};
