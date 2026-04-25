const RECIPIENT_DOMAIN_PROVIDER_BUCKETS = new Map<string, string>([
  ['googlemail.com', 'gmail.com'],
  ['hotmail.com', 'outlook.com'],
  ['live.com', 'outlook.com'],
  ['msn.com', 'outlook.com'],
  ['passport.com', 'outlook.com'],
  ['ymail.com', 'yahoo.com'],
  ['rocketmail.com', 'yahoo.com'],
  ['aol.com', 'yahoo.com'],
  ['me.com', 'icloud.com'],
  ['mac.com', 'icloud.com'],
]);

export const extractEmailDomain = (emailAddress: string): string => {
  const at = emailAddress.lastIndexOf('@');
  if (at < 0 || at === emailAddress.length - 1) return '';
  return emailAddress.slice(at + 1).trim().toLowerCase();
};

export const resolveRecipientDomainProviderBucket = (emailAddress: string): string => {
  const domain = extractEmailDomain(emailAddress);
  if (domain.length === 0) return '';
  return RECIPIENT_DOMAIN_PROVIDER_BUCKETS.get(domain) ?? domain;
};
