/* eslint-disable max-lines */

export type EmailKind = 'role' | 'personal' | 'disposable';

export type ClassifiedEmail = {
  kind: EmailKind;
  score: number;
};

export type ExtractedPageEmail = {
  address: string;
  sources: string[];
  kinds: EmailKind[];
};

export type ExtractedPageInput = {
  text?: string | null;
  html?: string | null;
  mailtos?: string[];
  jsonLd?: string[];
  microdataEmails?: string[];
};

export type ExtractedPageResult = {
  emails: ExtractedPageEmail[];
  breakdown: {
    regex: number;
    mailto: number;
    jsonLd: number;
    dataCfemail: number;
    microdata: number;
  };
  disposableSkipped: number;
};

type ExtractorApi = {
  EMAIL_REGEX: RegExp;
  decodeEntities: (value: string) => string;
  foldUnicode: (value: string) => string;
  normalizeEmail: (value: string) => string;
  isPlausibleEmail: (value: string) => boolean;
  classifyEmail: (value: string) => ClassifiedEmail;
  decodeCfemail: (hex: string) => string | null;
  extractCfemails: (html: string) => string[];
  extractEmailsFromPage: (input: ExtractedPageInput) => ExtractedPageResult;
  matchesContactKeyword: (text: string) => boolean;
};

/**
 * The extractor is defined as a JS source string so the same code can run in
 * Node (for unit tests + Node-side validation) and inside the Playwright
 * browser payload (where it is inlined as a literal). Functions attach to the
 * passed `api` object so the body has no module/import dependency.
 */
export const EXTRACTOR_BODY = `
const ROLE_ACCOUNTS = new Set([
  'noreply','no-reply','donotreply','do-not-reply',
  'mailer-daemon','postmaster','bounce','bounces'
]);
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','tempmail.com','10minutemail.com','guerrillamail.com',
  'yopmail.com','trashmail.com','sharklasers.com','dispostable.com',
  'getnada.com','maildrop.cc','throwawaymail.com','tempr.email',
  'fakeinbox.com','mintemail.com','mohmal.com','mytemp.email',
  'temp-mail.org','tempmailaddress.com','tmpmail.org','tempinbox.com',
  'spambox.us','mailcatch.com','spam4.me','emailondeck.com'
]);
const ASSET_EXT = /\\.(png|jpe?g|gif|svg|webp|bmp|css|js|woff2?|ttf|eot|ico|map|mp4|pdf)$/i;

api.EMAIL_REGEX = /[A-Z0-9._%+-]+\\s*(?:@|\\s*\\[at\\]\\s*|\\s*\\(at\\)\\s*|\\s+at\\s+)\\s*[A-Z0-9.-]+\\s*(?:\\.|\\s*\\[dot\\]\\s*|\\s*\\(dot\\)\\s*|\\s+dot\\s+)\\s*[A-Z]{2,24}/gi;

api.decodeEntities = function(value) {
  let out = String(value == null ? '' : value);
  out = out.replace(/&#0*64;|&#x0*40;|&commat;/gi, '@');
  out = out.replace(/&#0*46;|&#x0*2e;|&period;/gi, '.');
  out = out.replace(/&amp;/gi, '&');
  return out;
};

api.foldUnicode = function(value) {
  const raw = String(value == null ? '' : value);
  let normalized;
  try { normalized = raw.normalize('NFKC'); } catch (e) { normalized = raw; }
  return normalized.replace(/＠/g, '@').replace(/[․﹒]/g, '.');
};

api.normalizeEmail = function(value) {
  return api.foldUnicode(api.decodeEntities(value))
    .replace(/\\s*\\[at\\]\\s*|\\s*\\(at\\)\\s*|\\s+at\\s+/gi, '@')
    .replace(/\\s*\\[dot\\]\\s*|\\s*\\(dot\\)\\s*|\\s+dot\\s+/gi, '.')
    .replace(/\\s+/g, '')
    .toLowerCase()
    .trim();
};

api.isPlausibleEmail = function(value) {
  if (typeof value !== 'string') return false;
  if (value.length < 6 || value.length > 254) return false;
  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@')) return false;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (local.length === 0 || local.length > 64) return false;
  const dot = domain.lastIndexOf('.');
  if (dot <= 0 || dot === domain.length - 1) return false;
  const tld = domain.slice(dot + 1);
  if (!/^[a-z]{2,24}$/i.test(tld)) return false;
  if (ASSET_EXT.test(value)) return false;
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) return false;
  return true;
};

api.classifyEmail = function(value) {
  const at = String(value || '').indexOf('@');
  if (at < 0) return { kind: 'personal', score: 0 };
  const local = value.slice(0, at).toLowerCase();
  const domain = value.slice(at + 1).toLowerCase();
  if (DISPOSABLE_DOMAINS.has(domain)) return { kind: 'disposable', score: -100 };
  if (ROLE_ACCOUNTS.has(local)) return { kind: 'role', score: 1 };
  return { kind: 'personal', score: 10 };
};

api.decodeCfemail = function(hex) {
  if (typeof hex !== 'string' || hex.length < 4 || hex.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = '';
    for (let i = 2; i < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    }
    return out;
  } catch (e) { return null; }
};

api.extractCfemails = function(html) {
  const out = [];
  const re = /data-cfemail=["']([0-9a-fA-F]+)["']/g;
  let m;
  while ((m = re.exec(String(html || ''))) !== null) {
    const decoded = api.decodeCfemail(m[1]);
    if (decoded) out.push(decoded);
  }
  return out;
};

api.extractEmailsFromPage = function(input) {
  const found = new Map();
  const droppedDisposable = new Set();
  const breakdown = { regex: 0, mailto: 0, jsonLd: 0, dataCfemail: 0, microdata: 0 };

  const add = function(rawAddress, sourceKind) {
    const normalized = api.normalizeEmail(rawAddress);
    if (!api.isPlausibleEmail(normalized)) return false;
    const cls = api.classifyEmail(normalized);
    if (cls.kind === 'disposable') {
      droppedDisposable.add(normalized);
      return false;
    }
    const existed = found.has(normalized);
    const entry = found.get(normalized) || { sources: new Set(), kinds: new Set() };
    entry.sources.add(sourceKind);
    entry.kinds.add(cls.kind);
    found.set(normalized, entry);
    return !existed;
  };

  (input.mailtos || []).forEach(function(m) {
    const addr = String(m).replace(/^mailto:/i, '').split('?')[0];
    if (add(addr, 'mailto')) breakdown.mailto += 1;
  });

  api.extractCfemails(input.html || '').forEach(function(addr) {
    if (add(addr, 'data-cfemail')) breakdown.dataCfemail += 1;
  });

  (input.microdataEmails || []).forEach(function(addr) {
    if (add(addr, 'microdata')) breakdown.microdata += 1;
  });

  (input.jsonLd || []).forEach(function(blob) {
    const decoded = api.decodeEntities(api.foldUnicode(String(blob || '')));
    const matches = decoded.match(api.EMAIL_REGEX) || [];
    matches.forEach(function(m) { if (add(m, 'jsonLd')) breakdown.jsonLd += 1; });
  });

  const scan = api.decodeEntities(api.foldUnicode([input.text || '', input.html || ''].join('\\n')));
  const scanMatches = scan.match(api.EMAIL_REGEX) || [];
  scanMatches.forEach(function(m) { if (add(m, 'regex')) breakdown.regex += 1; });

  const emails = [];
  found.forEach(function(entry, address) {
    emails.push({
      address: address,
      sources: Array.from(entry.sources),
      kinds: Array.from(entry.kinds),
    });
  });
  return { emails: emails, breakdown: breakdown, disposableSkipped: droppedDisposable.size };
};

const CONTACT_WORDS = /(contact|kontakt|o-nas|onas|about|team|zespol|zarzad|biuro|office|firma|impressum|help|support|career|jobs|kariera|praca|pomoc|wsparcie)/i;
api.matchesContactKeyword = function(text) {
  return CONTACT_WORDS.test(String(text || ''));
};
`;

const buildExtractorApi = (): ExtractorApi => {
  const api = {} as ExtractorApi;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  new Function('api', EXTRACTOR_BODY)(api);
  return api;
};

const extractor = buildExtractorApi();

export const EMAIL_REGEX = extractor.EMAIL_REGEX;
export const decodeEntities = extractor.decodeEntities;
export const foldUnicode = extractor.foldUnicode;
export const normalizeEmail = extractor.normalizeEmail;
export const isPlausibleEmail = extractor.isPlausibleEmail;
export const classifyEmail = extractor.classifyEmail;
export const decodeCfemail = extractor.decodeCfemail;
export const extractCfemails = extractor.extractCfemails;
export const extractEmailsFromPage = extractor.extractEmailsFromPage;
export const matchesContactKeyword = extractor.matchesContactKeyword;
