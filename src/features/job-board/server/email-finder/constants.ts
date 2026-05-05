export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const CONTACT_PATHS = [
  '',
  '/kontakt',
  '/kontakt/',
  '/contact',
  '/contact/',
  '/contact-us',
  '/contact-us/',
  '/kontakt-pl',
  '/o-nas',
  '/about',
  '/about-us',
  '/kariera',
  '/careers',
  '/impressum',
];

export const CONTACT_LINK_HINTS = [
  { hint: 'kontakt', priority: 140 },
  { hint: 'contact', priority: 140 },
  { hint: 'get in touch', priority: 130 },
  { hint: 'about', priority: 110 },
  { hint: 'o nas', priority: 110 },
  { hint: 'o-nas', priority: 110 },
  { hint: 'impressum', priority: 105 },
  { hint: 'team', priority: 90 },
  { hint: 'company', priority: 80 },
  { hint: 'career', priority: 70 },
  { hint: 'careers', priority: 70 },
  { hint: 'kariera', priority: 70 },
  { hint: 'rekrutacja', priority: 70 },
  { hint: 'jobs', priority: 60 },
  { hint: 'privacy', priority: 45 },
  { hint: 'polityka prywatnosci', priority: 45 },
  { hint: 'polityka-prywatnosci', priority: 45 },
  { hint: 'rodo', priority: 40 },
];

export const COOKIE_ACCEPT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '[data-testid*="accept"]',
  '[aria-label*="accept" i]',
  '[id*="cookie"] button',
  '[class*="cookie"] button',
  '[id*="consent"] button',
  '[class*="consent"] button',
];

export const COOKIE_ACCEPT_TEXT_PATTERNS = [
  'accept all',
  'accept',
  'allow all',
  'allow',
  'agree',
  'i agree',
  'got it',
  'continue',
  'akceptuj',
  'zaakceptuj',
  'zgadzam',
  'rozumiem',
  'przejdz',
  'godkänn',
  'acceptera',
  'tillåt',
];

export const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}\b/g;
export const MAILTO_REGEX = /href\s*=\s*(["'])mailto:([^"'#>]+)(?:#[^"'>]*)?\1/gi;
export const ATTRIBUTE_EMAIL_REGEX = /(?:data-email|data-mail|content)\s*=\s*(["'])(.*?)\1/gi;
export const BINARY_PATH_RE =
  /\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|pdf|zip|rar|7z|mp4|mov|avi|mp3|wav)(?:[/?#]|$)/i;

export const NOISE_PATTERNS = [
  /@example\./i,
  /@domain\./i,
  /@localhost/i,
  /@.*\.png$/i,
  /@.*\.jpg$/i,
  /@.*\.svg$/i,
  /@sentry\.io$/i,
  /@wordpress\.com$/i,
  /@your-/i,
  /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i,
];

export const PERSONAL_PROVIDERS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'wp.pl',
  'onet.pl',
  'o2.pl',
  'interia.pl',
]);
