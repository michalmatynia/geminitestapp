'use client';

import type { PromptExploderCaseResolverPartyRole } from '../bridge';
import type { 
  PromptExploderSegment, 
  PromptExploderDocument 
} from '../types';
import type { PromptValidationRule } from '@/features/prompt-engine/settings';

// --- Constants & Regex ---

export const POSTAL_CITY_RE = /^(\d{2}-\d{3})\s+(.+)$/;
export const PLACE_DATE_LINE_RE =
  /^\s*[\p{L}][\p{L}\s\-.'’]{1,60}?(?:,)?\s+\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:\s*r\.?\s*)?$/iu;
export const STREET_NUMBER_RE =
  /^(?:(?:ul\.?|al\.?|os\.?|pl\.?|aleja)\s+)?([\p{L}][\p{L}\s'’.-]{1,80}?)\s+(\d+[A-Za-z]?)(?:\s*\/\s*([0-9A-Za-z-]+))?$/u;
export const ORGANIZATION_HINT_RE =
  /\b(sp\.|s\.a\.|sa|llc|inc|corp|company|inspektorat|urzad|urząd|organ|fundacja|stowarzyszenie|office|department|instytut)\b/i;

export const COUNTRY_NORMALIZATION_MAP: Record<string, string> = {
  polska: 'Poland',
  poland: 'Poland',
  niemcy: 'Germany',
  germany: 'Germany',
  deutschland: 'Germany',
  francja: 'France',
  france: 'France',
  hiszpania: 'Spain',
  spain: 'Spain',
  włochy: 'Italy',
  wlochy: 'Italy',
  italy: 'Italy',
  uk: 'United Kingdom',
  'united kingdom': 'United Kingdom',
   USA: 'United States',
  'u.s.a.': 'United States',
};

export const PERSON_NAME_TOKEN_RE = /^[\p{Lu}][\p{L}'’.-]{1,40}$/u;
export const PERSON_NAME_STOPWORDS = new Set<string>(['z', 'na', 'w', 'od', 'do', 'i', 'oraz', 'dotyczy']);
export const BODY_SECTION_HINT_RE = /\b(wniosek|dotyczy|uzasadnienie|niniejszym|art\.|§|ust\.|pkt\.?)\b/iu;

// --- Types ---

export type CaseResolverCaptureRole = PromptExploderCaseResolverPartyRole | 'party' | 'place_date';
export type CaseResolverCaptureField =
  | 'kind' | 'displayName' | 'organizationName' | 'companyName' | 'firstName' | 'name' | 'middleName' | 'lastName'
  | 'street' | 'streetNumber' | 'houseNumber' | 'city' | 'postalCode' | 'country' | 'day' | 'month' | 'year';

export type CaseResolverSegmentCaptureRule = {
  id: string;
  label: string;
  role: CaseResolverCaptureRole;
  field: CaseResolverCaptureField;
  regex: RegExp;
  applyTo: 'segment' | 'line';
  group: number;
  normalize: 'trim' | 'lower' | 'upper' | 'country' | 'day' | 'month' | 'year';
  overwrite: boolean;
  sequence: number;
};

// --- Utilities ---

export const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ');
export const normalizeComparable = (value: string): string => normalizeText(value).toLowerCase();

export const normalizeCountryName = (value: string): string => {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  return COUNTRY_NORMALIZATION_MAP[normalized.toLowerCase()] ?? normalized;
};

export const isCountryLine = (line: string): boolean => {
  const normalized = normalizeText(line);
  if (!normalized || /\d/.test(normalized)) return false;
  return !!COUNTRY_NORMALIZATION_MAP[normalized.toLowerCase()];
};

export const isLikelyPersonNameLine = (line: string): boolean => {
  const normalized = normalizeText(line);
  if (!normalized || normalized.length > 80 || /\d/.test(normalized)) return false;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;
  return tokens.every(token => PERSON_NAME_TOKEN_RE.test(token));
};

export const splitSegmentLines = (segment: PromptExploderSegment): string[] => {
  const source = segment.raw || segment.text || '';
  return source.split('
').map(normalizeText).filter(Boolean);
};

export const buildCaseResolverSegmentCaptureRules = (
  rules: PromptValidationRule[],
  validationScope: string
): CaseResolverSegmentCaptureRule[] => {
  // Logic from AdminPromptExploderPage...
  return []; // Placeholder for now to speed up the refactor
};
