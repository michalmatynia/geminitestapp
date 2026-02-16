'use client';

import { ArrowDown, ArrowUp, GripVertical, Link2, Plus, RefreshCcw, Settings2, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
  type ValidatorPatternList,
} from '@/features/admin/pages/validator-scope';
import { extractParamsFromPrompt, setDeepValue } from '@/features/prompt-engine/prompt-params';
import {
  defaultPromptEngineSettings,
  parsePromptEngineSettings,
  parsePromptValidationRules,
  PROMPT_ENGINE_SETTINGS_KEY,
  type PromptValidationRule,
} from '@/features/prompt-engine/settings';
import {
  useSettingsMap,
  useUpdateSetting,
} from '@/shared/hooks/use-settings';
import {
  Button,
  EmptyState,
  FormSection,
  Input,
  Label,
  SectionHeader,
  StatusToggle,
  Textarea,
  SelectSimple,
  useToast,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES,
  EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES,
  PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET,
  PROMPT_EXPLODER_DEFAULT_LOW_CONFIDENCE_THRESHOLD,
  PROMPT_EXPLODER_DEFAULT_SUGGESTION_LIMIT,
  type PromptExploderBenchmarkCase,
  type PromptExploderBenchmarkReport,
  type PromptExploderBenchmarkSuggestion,
  runPromptExploderBenchmark,
} from '../benchmark';
import { applyBenchmarkSuggestions } from '../benchmark-apply';
import { prepareBenchmarkSuggestionsForApply } from '../benchmark-suggestions';
import {
  consumePromptExploderDraftPayload,
  readPromptExploderDraftPayload,
  savePromptExploderApplyPrompt,
  savePromptExploderApplyPromptForCaseResolver,
} from '../bridge';
import { PromptExploderHierarchyTreeProvider } from '../components/PromptExploderHierarchyTreeContext';
import { PromptExploderHierarchyTreeEditor } from '../components/PromptExploderHierarchyTreeEditor';
import { PromptExploderParserTuningProvider } from '../components/PromptExploderParserTuningContext';
import { PromptExploderParserTuningPanel } from '../components/PromptExploderParserTuningPanel';
import {
  defaultCustomBenchmarkCaseIdFromPrompt,
  mergeCustomBenchmarkCases,
  parseCustomBenchmarkCasesDraft,
  upsertCustomBenchmarkCase,
} from '../custom-benchmark-cases';
import {
  readRegexCaptureGroup,
} from '../helpers/capture';
import {
  reorderListItemsForDrop,
  reorderSegmentsForDrop,
  resolveDropPosition,
} from '../helpers/drag-reorder';
import {
  promptExploderClampNumber,
  promptExploderBenchmarkSuiteLabel,
  promptExploderSafeJsonStringify,
  promptExploderIsFiniteNumber,
  promptExploderInferParamTypeLabel,
} from '../helpers/formatting';
import {
  createLogicalCondition,
  PROMPT_EXPLODER_LOGICAL_OPERATOR_OPTIONS,
  PROMPT_EXPLODER_LOGICAL_COMPARATOR_OPTIONS,
  PROMPT_EXPLODER_LOGICAL_JOIN_OPTIONS,
  isLogicalComparator,
  isLogicalJoin,
  parseLogicalValueText,
  formatLogicalValueText,
  parseSubsectionConditionText,
  buildSubsectionConditionText,
} from '../helpers/logical-conditions';
import {
  extractRgbLiteral,
  rgbToHex,
  hexToRgb,
  replaceRgbLiteral,
} from '../helpers/rgb';
import {
  promptExploderAddBlankListItem,
  promptExploderCreateSubsection,
  promptExploderCreateManualBindingId,
  formatSubsectionLabel,
  buildSegmentSampleText,
  createApprovalDraftFromSegment,
  isPromptExploderManagedRule,
} from '../helpers/segment-helpers';
import {
  buildManualBindingFromDraft,
  resolveManualBindingSegmentIds,
  resolveManualBindingSubsectionIds,
} from '../manual-bindings';
import {
  buildPromptExploderParamEntries,
  isParamArrayTupleLength,
  isPromptExploderParamUiControl,
  promptExploderParamUiControlLabel,
  renderPromptExploderParamsText,
  sanitizeParamJsonValue,
  setParamTextMetaForPath,
  setParamUiControlForPath,
  type PromptExploderParamEntry,
  type PromptExploderParamEntriesState,
} from '../params-editor';
import {
  ensureSegmentTitle,
  explodePromptText,
  moveByDelta,
  reassemblePromptSegments,
  updatePromptExploderDocument,
} from '../parser';
import {
  applyPromptExploderParserTuningDrafts,
  buildPromptExploderParserTuningDrafts,
  validatePromptExploderParserTuningDrafts,
  type PromptExploderParserTuningRuleDraft,
} from '../parser-tuning';
import {
  getPromptExploderScopedRules,
  PROMPT_EXPLODER_PATTERN_PACK,
  PROMPT_EXPLODER_PATTERN_PACK_IDS,
} from '../pattern-pack';
import {
  buildPatternSnapshot,
  mergeRestoredPromptExploderRules,
  prependPatternSnapshot,
  removePatternSnapshotById,
} from '../pattern-snapshots';
import {
  getManualBindingsFromDocument,
  hydratePromptExploderLibraryDocument,
  parsePromptExploderLibrary,
  PROMPT_EXPLODER_LIBRARY_KEY,
  sortPromptExploderLibraryItemsByUpdated,
} from '../prompt-library';
import {
  buildManualLearnedRegexRuleDraft,
} from '../rule-drafts';
import { upsertRegexLearnedRule } from '../rule-learning';
import {
  buildRuntimeRulesForReexplode,
  buildRuntimeTemplatesForReexplode,
  filterTemplatesForRuntime,
  reexplodePromptWithRuntime,
  resolveSegmentIdAfterReexplode,
} from '../runtime-refresh';
import {
  parsePromptExploderSettings,
  PROMPT_EXPLODER_SETTINGS_KEY,
} from '../settings';
import {
  normalizeLearningText,
  templateSimilarityScore,
  upsertLearnedTemplate,
  type TemplateMergeMode,
} from '../template-learning';
import {
  buildPromptExploderValidationRuleStackOptions,
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
  normalizePromptExploderValidationRuleStack,
  promptExploderValidationScopeFromStack,
  promptExploderValidationStackFromBridgeSource,
  promptExploderValidatorScopeFromStack,
} from '../validation-stack';

import type {
  PromptExploderCaseResolverPartyBundle,
  PromptExploderCaseResolverPartyCandidate,
  PromptExploderCaseResolverPartyRole,
} from '../bridge';
import type {
  PromptExploderBenchmarkSuite,
  PromptExploderBinding,
  PromptExploderBindingType,
  PromptExploderDocument,
  PromptExploderLearnedTemplate,
  PromptExploderLogicalComparator,
  PromptExploderLogicalCondition,
  PromptExploderLogicalOperator,
  PromptExploderParamUiControl,
  PromptExploderPatternSnapshot,
  PromptExploderListItem,
  PromptExploderSegment,
} from '../types';

type CaseResolverPartySegmentSelection = {
  addresserSegmentId: string;
  addresseeSegmentId: string;
};

type CaseResolverPlaceDateCandidate = {
  city?: string | undefined;
  day?: string | undefined;
  month?: string | undefined;
  year?: string | undefined;
  sourceSegmentId?: string | undefined;
  sourceSegmentTitle?: string | undefined;
  sourcePatternLabels?: string[] | undefined;
  sourceSequenceLabels?: string[] | undefined;
};

type CaseResolverStructuredSegmentDraft =
  | {
    kind: 'place_date';
    city: string;
    day: string;
    month: string;
    year: string;
  }
  | {
    kind: 'party';
    role: PromptExploderCaseResolverPartyRole;
    companyName: string;
    name: string;
    middleName: string;
    lastName: string;
    street: string;
    streetNumber: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
  };

const EMPTY_CASE_RESOLVER_PARTY_SELECTION: CaseResolverPartySegmentSelection = {
  addresserSegmentId: '',
  addresseeSegmentId: '',
};

const POSTAL_CITY_RE = /^(\d{2}-\d{3})\s+(.+)$/;
const PLACE_DATE_LINE_RE =
  /^\s*[\p{L}][\p{L}\s\-.'’]{1,60}?(?:,)?\s+\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:\s*r\.?\s*)?$/iu;
const STREET_NUMBER_RE =
  /^(?:(?:ul\.?|al\.?|os\.?|pl\.?|aleja)\s+)?([\p{L}][\p{L}\s'’.-]{1,80}?)\s+(\d+[A-Za-z]?)(?:\s*\/\s*([0-9A-Za-z-]+))?$/u;
const ORGANIZATION_HINT_RE =
  /\b(sp\.|s\.a\.|sa|llc|inc|corp|company|inspektorat|urzad|urząd|organ|fundacja|stowarzyszenie|office|department|instytut)\b/i;
const COUNTRY_NORMALIZATION_MAP: Record<string, string> = {
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
  'wielka brytania': 'United Kingdom',
  usa: 'United States',
  'u.s.a.': 'United States',
  'stany zjednoczone': 'United States',
};
const KNOWN_COUNTRY_KEYS = new Set(Object.keys(COUNTRY_NORMALIZATION_MAP));
const PERSON_NAME_TOKEN_RE = /^[\p{Lu}][\p{L}'’.-]{1,40}$/u;
const PERSON_NAME_STOPWORDS = new Set<string>([
  'z',
  'ze',
  'na',
  'w',
  'we',
  'od',
  'do',
  'i',
  'oraz',
  'a',
  'o',
  'dotyczy',
  'wniosek',
  'uzasadnienie',
  'niniejszym',
  'pozdrawiam',
  'poważaniem',
  'powazaniem',
  'sincerely',
  'regards',
  'inspektorat',
  'urząd',
  'urzad',
  'zus',
  'organ',
  'sąd',
  'sad',
  'ministerstwo',
]);
const BODY_SECTION_HINT_RE =
  /\b(wniosek|dotyczy|uzasadnienie|niniejszym|na\s+podstawie|postępowania|postepowania|administracyjnego|z\s+poważaniem|z\s+powazaniem|sincerely|regards|art\.|§|ust\.|pkt\.?)\b/iu;
const ADDRESSER_ROLE_HINTS = [
  'addresser',
  'nadawca',
  'sender',
  'wnioskodawca',
  'from',
];
const ADDRESSEE_ROLE_HINTS = [
  'addressee',
  'adresat',
  'recipient',
  'odbiorca',
  'organ',
  'to',
];
const PLACE_DATE_ROLE_HINTS = [
  'place_date',
  'place date',
  'city date',
  'miejsce data',
  'data miejsc',
];
const CASE_RESOLVER_PLACE_DATE_HEADING_PATTERN_ID =
  'segment.case_resolver.heading.place_date';
const CASE_RESOLVER_ADDRESSER_HEADING_PATTERN_ID =
  'segment.case_resolver.heading.addresser_person';
const CASE_RESOLVER_ADDRESSEE_HEADING_PATTERN_ID =
  'segment.case_resolver.heading.addressee_organization';

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ');

const normalizeComparable = (value: string): string => normalizeText(value).toLowerCase();

const normalizeCountryName = (value: string): string => {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  return COUNTRY_NORMALIZATION_MAP[normalized.toLowerCase()] ?? normalized;
};

const isCountryLine = (line: string): boolean => {
  const normalized = normalizeText(line);
  if (!normalized || /\d/.test(normalized)) return false;
  return KNOWN_COUNTRY_KEYS.has(normalized.toLowerCase());
};

const isLikelyPersonNameLine = (line: string): boolean => {
  const normalized = normalizeText(line);
  if (!normalized) return false;
  if (normalized.length > 80) return false;
  if (/\d/.test(normalized)) return false;
  if (/[,:;!?()[\]{}<>§]/u.test(normalized)) return false;
  if (BODY_SECTION_HINT_RE.test(normalized)) return false;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;
  if (!tokens.every((token: string): boolean => PERSON_NAME_TOKEN_RE.test(token))) return false;
  const normalizedTokens = tokens.map((token: string): string => normalizeComparable(token));
  return normalizedTokens.every((token: string): boolean => !PERSON_NAME_STOPWORDS.has(token));
};

const isBodyLikeLine = (line: string): boolean => {
  const normalized = normalizeText(line);
  if (!normalized) return false;
  if (BODY_SECTION_HINT_RE.test(normalized)) return true;
  const tokenCount = normalized.split(/\s+/).length;
  if (normalized.length >= 140) return true;
  return tokenCount >= 10 && /[.!?;:]/.test(normalized);
};

const isLikelyBodySection = (lines: string[]): boolean => {
  const normalizedLines = lines
    .map((line: string): string => normalizeText(line))
    .filter((line: string): boolean => line.length > 0);
  if (normalizedLines.length < 3) return false;
  const bodyLikeCount = normalizedLines.filter(isBodyLikeLine).length;
  if (bodyLikeCount >= 2) return true;
  const sentenceLikeCount = normalizedLines.filter(
    (line: string): boolean => line.split(/\s+/).length >= 12
  ).length;
  return bodyLikeCount >= 1 && sentenceLikeCount >= 2;
};

const toSegmentSourceText = (segment: PromptExploderSegment): string => {
  const source = segment.raw || segment.text || '';
  return source.trim();
};

const toSegmentPatternLabels = (segment: PromptExploderSegment): string[] => {
  const labels = new Set<string>();
  (segment.matchedPatternLabels ?? []).forEach((label: string) => {
    const normalized = normalizeText(label);
    if (!normalized) return;
    labels.add(normalized);
  });
  if (labels.size === 0) {
    (segment.matchedPatternIds ?? []).forEach((patternId: string) => {
      const normalized = normalizeText(patternId);
      if (!normalized) return;
      labels.add(normalized);
    });
  }
  return [...labels];
};

const toSegmentSequenceLabels = (segment: PromptExploderSegment): string[] => {
  const labels = new Set<string>();
  (segment.matchedSequenceLabels ?? []).forEach((label: string) => {
    const normalized = normalizeText(label);
    if (!normalized) return;
    labels.add(normalized);
  });
  return [...labels];
};

const buildSegmentRoleSignalSource = (segment: PromptExploderSegment): string => {
  const rawTokens = [
    segment.title,
    toSegmentSourceText(segment),
    ...(segment.matchedPatternIds ?? []),
    ...toSegmentPatternLabels(segment),
    ...toSegmentSequenceLabels(segment),
  ].filter((value: string): boolean => normalizeText(value).length > 0);
  return normalizeComparable(rawTokens.join(' '));
};

const hasRoleHint = (
  source: string,
  hints: string[]
): boolean => {
  return hints.some((hint: string): boolean => source.includes(normalizeComparable(hint)));
};

const splitSegmentLines = (segment: PromptExploderSegment): string[] =>
  toSegmentSourceText(segment)
    .split('\n')
    .map((line: string): string => normalizeText(line))
    .filter((line: string): boolean => line.length > 0);

const resolveSegmentDisplayLabel = (segment: PromptExploderSegment): string => {
  const explicitTitle = normalizeText(segment.title);
  if (explicitTitle) return explicitTitle;
  const firstLine = splitSegmentLines(segment)[0] ?? '';
  return firstLine || `Segment ${segment.id}`;
};

const hasCaseResolverPlaceDateSignal = (segment: PromptExploderSegment): boolean => {
  const matchedPatternIds = segment.matchedPatternIds ?? [];
  if (
    matchedPatternIds.some((patternId: string): boolean =>
      patternId === CASE_RESOLVER_PLACE_DATE_HEADING_PATTERN_ID ||
      patternId.startsWith('segment.case_resolver.extract.place_date.')
    )
  ) {
    return true;
  }
  const firstLine = splitSegmentLines(segment)[0] ?? '';
  if (PLACE_DATE_LINE_RE.test(firstLine)) return true;
  const signalSource = buildSegmentRoleSignalSource(segment);
  return hasRoleHint(signalSource, PLACE_DATE_ROLE_HINTS);
};

type CaseResolverCaptureRole = PromptExploderCaseResolverPartyRole | 'party' | 'place_date';
type CaseResolverCaptureField =
  | 'kind'
  | 'displayName'
  | 'organizationName'
  | 'companyName'
  | 'firstName'
  | 'name'
  | 'middleName'
  | 'lastName'
  | 'street'
  | 'streetNumber'
  | 'houseNumber'
  | 'city'
  | 'postalCode'
  | 'country'
  | 'day'
  | 'month'
  | 'year';

type CaseResolverSegmentCaptureRule = {
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

const CASE_RESOLVER_CAPTURE_TARGET_PREFIX = 'case_resolver.';

const normalizeRegexFlags = (flags: string): string => flags.replace(/[gy]/g, '');

const compileCaptureRegex = (
  pattern: string,
  flags: string
): RegExp | null => {
  try {
    return new RegExp(pattern, normalizeRegexFlags(flags));
  } catch {
    return null;
  }
};

const parseCaseResolverCaptureTarget = (
  target: string
): { role: CaseResolverCaptureRole; field: CaseResolverCaptureField } | null => {
  const normalized = target.trim();
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  if (!lower.startsWith(CASE_RESOLVER_CAPTURE_TARGET_PREFIX)) return null;
  const path = normalized.slice(CASE_RESOLVER_CAPTURE_TARGET_PREFIX.length);
  const parts = path.split('.').map((segment) => segment.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const roleRaw = parts[0]?.toLowerCase();
  if (
    roleRaw !== 'addresser' &&
    roleRaw !== 'addressee' &&
    roleRaw !== 'party' &&
    roleRaw !== 'place_date'
  ) {
    return null;
  }

  const fieldPath = parts.slice(1).join('.').replace(/^address\./i, '');
  const fieldRaw = fieldPath.toLowerCase();
  const fieldMap: Record<string, CaseResolverCaptureField> = {
    kind: 'kind',
    displayname: 'displayName',
    organizationname: 'organizationName',
    companyname: 'companyName',
    firstname: 'firstName',
    name: 'name',
    middlename: 'middleName',
    lastname: 'lastName',
    street: 'street',
    streetnumber: 'streetNumber',
    housenumber: 'houseNumber',
    city: 'city',
    postalcode: 'postalCode',
    country: 'country',
    day: 'day',
    month: 'month',
    year: 'year',
  };
  const mappedField = fieldMap[fieldRaw];
  if (!mappedField) return null;

  return {
    role: roleRaw as CaseResolverCaptureRole,
    field: mappedField,
  };
};

const normalizeCapturedValue = (
  value: string,
  mode: CaseResolverSegmentCaptureRule['normalize']
): string => {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  if (mode === 'lower') return normalized.toLowerCase();
  if (mode === 'upper') return normalized.toUpperCase();
  if (mode === 'country') return normalizeCountryName(normalized);
  if (mode === 'day' || mode === 'month') {
    const digits = normalized.replace(/\D/g, '');
    if (!digits) return '';
    const numeric = Number(digits);
    if (!Number.isFinite(numeric)) return '';
    const bounded = mode === 'day'
      ? Math.min(31, Math.max(1, Math.floor(numeric)))
      : Math.min(12, Math.max(1, Math.floor(numeric)));
    return String(bounded).padStart(2, '0');
  }
  if (mode === 'year') {
    const digits = normalized.replace(/\D/g, '');
    if (!digits) return '';
    const numeric = Number(digits);
    if (!Number.isFinite(numeric)) return '';
    if (digits.length <= 2) {
      return String(2000 + Math.floor(numeric));
    }
    return String(Math.floor(numeric));
  }
  return normalized;
};

const inferPartyKindFromLines = (lines: string[]): 'person' | 'organization' => {
  const firstLine = normalizeText(lines[0] ?? '');
  if (!firstLine) return 'organization';
  if (ORGANIZATION_HINT_RE.test(firstLine)) return 'organization';
  if (/\d/.test(firstLine)) return 'organization';
  const hasAddressSignal = lines
    .slice(1)
    .some((line: string): boolean => POSTAL_CITY_RE.test(line) || STREET_NUMBER_RE.test(line) || isCountryLine(line));
  if (isLikelyPersonNameLine(firstLine) && (hasAddressSignal || lines.length <= 2)) {
    return 'person';
  }
  return 'organization';
};

const parsePersonName = (line: string): {
  firstName?: string | undefined;
  middleName?: string | undefined;
  lastName?: string | undefined;
} => {
  if (!isLikelyPersonNameLine(line)) {
    return {};
  }
  const tokens = normalizeText(line).split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return {};
  if (tokens.length === 2) {
    return {
      firstName: tokens[0],
      lastName: tokens[1],
    };
  }
  return {
    firstName: tokens[0],
    middleName: tokens.slice(1, -1).join(' ').trim() || undefined,
    lastName: tokens[tokens.length - 1],
  };
};

const extractAddressFields = (lines: string[]): {
  street?: string | undefined;
  streetNumber?: string | undefined;
  houseNumber?: string | undefined;
  city?: string | undefined;
  postalCode?: string | undefined;
  country?: string | undefined;
} => {
  const addressLines = lines.map((line: string): string => normalizeText(line)).filter(Boolean);
  let street = '';
  let streetNumber = '';
  let houseNumber = '';
  let city = '';
  let postalCode = '';
  let country = '';

  addressLines.forEach((line: string, index: number) => {
    const postalMatch = POSTAL_CITY_RE.exec(line);
    if (postalMatch) {
      postalCode = normalizeText(postalMatch[1] ?? '');
      city = normalizeText(postalMatch[2] ?? '');
      return;
    }
    const streetMatch = STREET_NUMBER_RE.exec(line);
    if (!street && streetMatch) {
      street = normalizeText(streetMatch[1] ?? '');
      streetNumber = normalizeText(streetMatch[2] ?? '');
      houseNumber = normalizeText(streetMatch[3] ?? '');
      return;
    }
    const isLast = index === addressLines.length - 1;
    if (!country && isLast && isCountryLine(line)) {
      country = normalizeCountryName(line);
      return;
    }
    if (!city && !/\d/.test(line) && line.split(/\s+/).length <= 4 && !isBodyLikeLine(line)) {
      city = line;
    }
  });

  return {
    street: street || undefined,
    streetNumber: streetNumber || undefined,
    houseNumber: houseNumber || undefined,
    city: city || undefined,
    postalCode: postalCode || undefined,
    country: normalizeCountryName(country) || undefined,
  };
};

const isLikelyAddressSegment = (lines: string[]): boolean => {
  if (lines.length < 2 || lines.length > 8) return false;
  const addressLines = lines
    .slice(1)
    .map((line: string): string => normalizeText(line))
    .filter((line: string): boolean => line.length > 0);
  if (addressLines.length === 0) return false;
  const hasPostalCity = addressLines.some((line: string): boolean => POSTAL_CITY_RE.test(line));
  if (hasPostalCity) return true;
  const hasStreetNumber = addressLines.some((line: string): boolean => STREET_NUMBER_RE.test(line));
  if (!hasStreetNumber) return false;
  const hasCountry = addressLines.some((line: string): boolean => isCountryLine(line));
  const bodyLikeLineCount = addressLines.filter(isBodyLikeLine).length;
  if (bodyLikeLineCount >= 2) return false;
  const shortAddressishLineCount = addressLines.filter(
    (line: string): boolean => line.split(/\s+/).length <= 5
  ).length;
  return hasCountry || shortAddressishLineCount >= 2;
};

const isLikelyPartyHeadingSegment = (lines: string[]): boolean => {
  if (lines.length === 0 || lines.length > 8) return false;
  if (isLikelyBodySection(lines)) return false;
  const firstLine = lines[0] ?? '';
  if (isLikelyPersonNameLine(firstLine)) return true;
  if (ORGANIZATION_HINT_RE.test(firstLine)) return true;
  return isLikelyAddressSegment(lines);
};

const buildCaseResolverSegmentCaptureRules = (
  rules: PromptValidationRule[],
  validationScope: 'prompt_exploder' | 'case_resolver_prompt_exploder'
): CaseResolverSegmentCaptureRule[] => {
  const out: CaseResolverSegmentCaptureRule[] = [];
  rules.forEach((rule) => {
    if (rule.kind !== 'regex' || !rule.enabled) return;
    const captureTarget = rule.promptExploderCaptureTarget?.trim() ?? '';
    if (!captureTarget) return;
    const parsedTarget = parseCaseResolverCaptureTarget(captureTarget);
    if (!parsedTarget) return;
    const scopes = rule.appliesToScopes ?? [];
    const scopeAllowed =
      scopes.length === 0 ||
      scopes.includes(validationScope) ||
      scopes.includes('global');
    if (!scopeAllowed) return;
    const regex = compileCaptureRegex(rule.pattern, rule.flags);
    if (!regex) return;
    const group =
      typeof rule.promptExploderCaptureGroup === 'number' &&
      Number.isFinite(rule.promptExploderCaptureGroup)
        ? Math.max(0, Math.floor(rule.promptExploderCaptureGroup))
        : 1;
    const applyTo = rule.promptExploderCaptureApplyTo === 'line' ? 'line' : 'segment';
    const normalize =
      rule.promptExploderCaptureNormalize === 'lower' ||
      rule.promptExploderCaptureNormalize === 'upper' ||
      rule.promptExploderCaptureNormalize === 'country' ||
      rule.promptExploderCaptureNormalize === 'day' ||
      rule.promptExploderCaptureNormalize === 'month' ||
      rule.promptExploderCaptureNormalize === 'year'
        ? rule.promptExploderCaptureNormalize
        : 'trim';
    out.push({
      id: rule.id,
      label: rule.title.trim() || rule.id,
      role: parsedTarget.role,
      field: parsedTarget.field,
      regex,
      applyTo,
      group,
      normalize,
      overwrite: rule.promptExploderCaptureOverwrite ?? false,
      sequence:
        typeof rule.sequence === 'number' && Number.isFinite(rule.sequence)
          ? Math.max(0, Math.floor(rule.sequence))
          : 0,
    });
  });
  return out.sort((left, right) => {
    if (left.sequence !== right.sequence) return left.sequence - right.sequence;
    return left.id.localeCompare(right.id);
  });
};

const scoreSegmentForPartyRole = (
  segment: PromptExploderSegment,
  role: PromptExploderCaseResolverPartyRole,
  captureRules: CaseResolverSegmentCaptureRule[]
): number => {
  const lines = splitSegmentLines(segment);
  const normalized = buildSegmentRoleSignalSource(segment);
  const roleHints = role === 'addresser' ? ADDRESSER_ROLE_HINTS : ADDRESSEE_ROLE_HINTS;
  const lineCount = lines.length;
  const matchedRuleIds = new Set(segment.matchedPatternIds ?? []);
  const roleCaptureMatches = captureRules.filter((rule) => {
    if (rule.role !== role && rule.role !== 'party') return false;
    return matchedRuleIds.has(rule.id);
  });
  const placeDateCaptureMatches = captureRules.filter((rule) => {
    if (rule.role !== 'place_date') return false;
    return matchedRuleIds.has(rule.id);
  });
  const nameCaptureMatchCount = roleCaptureMatches.filter((rule) =>
    rule.field === 'firstName' ||
    rule.field === 'middleName' ||
    rule.field === 'lastName' ||
    rule.field === 'name'
  ).length;
  const isAddressLikeSegment = isLikelyAddressSegment(lines);
  const isBodySection = isLikelyBodySection(lines);
  const isPlaceDateSegment = hasCaseResolverPlaceDateSignal(segment);
  let score = lineCount >= 2 ? 4 : 1;
  if (isPlaceDateSegment) {
    score -= 30;
  }
  if (isBodySection) {
    score -= 60;
  }
  if (lineCount > 8) {
    score -= 36;
  }
  score += roleCaptureMatches.length * 18;
  if (nameCaptureMatchCount > 0 && !isLikelyPersonNameLine(lines[0] ?? '')) {
    score -= 48;
  }
  score -= placeDateCaptureMatches.length * 14;
  if (hasRoleHint(normalized, roleHints)) {
    score += 30;
  }
  if (isAddressLikeSegment) {
    score += 8;
  }
  if (isLikelyPartyHeadingSegment(lines)) {
    score += 6;
  }
  roleHints.forEach((keyword: string) => {
    if (normalized.includes(keyword)) score += 12;
  });
  if (segment.type === 'assigned_text') score += 3;
  return score;
};

const suggestCaseResolverPartySegmentIds = (
  segments: PromptExploderSegment[],
  captureRules: CaseResolverSegmentCaptureRule[]
): CaseResolverPartySegmentSelection => {
  const orderedCandidates = segments
    .map((segment: PromptExploderSegment) => ({
      segment,
      lines: splitSegmentLines(segment),
    }))
    .filter(
      (entry): boolean =>
        entry.lines.length > 0 &&
        !isLikelyBodySection(entry.lines) &&
        !hasCaseResolverPlaceDateSignal(entry.segment) &&
        isLikelyAddressSegment(entry.lines)
    );

  if (orderedCandidates.length >= 2) {
    return {
      addresserSegmentId: orderedCandidates[0]?.segment.id ?? '',
      addresseeSegmentId: orderedCandidates[1]?.segment.id ?? '',
    };
  }

  const candidates = segments.filter((segment: PromptExploderSegment): boolean => {
    const lines = splitSegmentLines(segment);
    return (
      lines.length > 0 &&
      !isLikelyBodySection(lines) &&
      !hasCaseResolverPlaceDateSignal(segment)
    );
  });
  const rankedCandidates = candidates.length > 0
    ? candidates
    : segments.filter(
      (segment: PromptExploderSegment): boolean => splitSegmentLines(segment).length > 0
    );
  if (rankedCandidates.length === 0) return EMPTY_CASE_RESOLVER_PARTY_SELECTION;

  const rankedAddresser = [...rankedCandidates].sort(
    (left: PromptExploderSegment, right: PromptExploderSegment): number =>
      scoreSegmentForPartyRole(right, 'addresser', captureRules) -
      scoreSegmentForPartyRole(left, 'addresser', captureRules)
  );
  const addresserSegmentId = rankedAddresser[0]?.id ?? '';
  const rankedAddressee = [...rankedCandidates]
    .filter((segment: PromptExploderSegment): boolean => segment.id !== addresserSegmentId)
    .sort(
      (left: PromptExploderSegment, right: PromptExploderSegment): number =>
        scoreSegmentForPartyRole(right, 'addressee', captureRules) -
        scoreSegmentForPartyRole(left, 'addressee', captureRules)
    );
  const addresseeSegmentId = rankedAddressee[0]?.id ?? '';

  return {
    addresserSegmentId,
    addresseeSegmentId,
  };
};

const applyCaptureFieldToPartyCandidate = (
  candidate: PromptExploderCaseResolverPartyCandidate,
  field: CaseResolverCaptureField,
  value: string,
  overwrite: boolean
): void => {
  if (!value) return;
  const setValue = <K extends keyof PromptExploderCaseResolverPartyCandidate>(
    key: K,
    next: string
  ): void => {
    const current = candidate[key];
    if (!overwrite && typeof current === 'string' && current.trim().length > 0) return;
    (candidate[key] as unknown) = next;
  };
  if (field === 'kind') {
    const normalized = value.toLowerCase();
    if (normalized !== 'person' && normalized !== 'organization') return;
    if (!overwrite && candidate.kind) return;
    candidate.kind = normalized;
    return;
  }
  if (field === 'displayName') {
    setValue('displayName', value);
    return;
  }
  if (field === 'organizationName' || field === 'companyName') {
    setValue('organizationName', value);
    return;
  }
  if (field === 'firstName' || field === 'name') {
    setValue('firstName', value);
    return;
  }
  if (field === 'middleName') {
    setValue('middleName', value);
    return;
  }
  if (field === 'lastName') {
    setValue('lastName', value);
    return;
  }
  if (field === 'street') {
    setValue('street', value);
    return;
  }
  if (field === 'streetNumber') {
    setValue('streetNumber', value);
    return;
  }
  if (field === 'houseNumber') {
    setValue('houseNumber', value);
    return;
  }
  if (field === 'postalCode') {
    setValue('postalCode', value);
    return;
  }
  if (field === 'city') {
    setValue('city', value);
    return;
  }
  if (field === 'country') {
    setValue('country', normalizeCountryName(value));
  }
};

const applyCaptureFieldToPlaceDate = (
  candidate: CaseResolverPlaceDateCandidate,
  field: CaseResolverCaptureField,
  value: string,
  overwrite: boolean
): void => {
  if (!value) return;
  const setValue = (
    key: 'city' | 'day' | 'month' | 'year',
    next: string
  ): void => {
    const current = candidate[key];
    if (!overwrite && typeof current === 'string' && current.trim().length > 0) return;
    candidate[key] = next;
  };
  if (field === 'city') {
    setValue('city', value);
    return;
  }
  if (field === 'day') {
    setValue('day', value);
    return;
  }
  if (field === 'month') {
    setValue('month', value);
    return;
  }
  if (field === 'year') {
    setValue('year', value);
  }
};

const applySegmentCaptureRules = (args: {
  segment: PromptExploderSegment;
  rules: CaseResolverSegmentCaptureRule[];
  onCapture: (
    field: CaseResolverCaptureField,
    value: string,
    overwrite: boolean
  ) => void;
}): boolean => {
  const source = toSegmentSourceText(args.segment);
  const lines = splitSegmentLines(args.segment);
  const firstLine = lines[0] ?? '';
  const firstLineIsPersonName = isLikelyPersonNameLine(firstLine);
  let matched = false;

  args.rules.forEach((rule: CaseResolverSegmentCaptureRule) => {
    const isPersonNameField =
      rule.field === 'firstName' ||
      rule.field === 'middleName' ||
      rule.field === 'lastName' ||
      rule.field === 'name';
    const isOrganizationNameField =
      rule.field === 'organizationName' ||
      rule.field === 'companyName';
    if (isPersonNameField && !firstLineIsPersonName) {
      return;
    }
    let inputs = rule.applyTo === 'line' ? lines : [source];
    if (rule.applyTo === 'line' && isPersonNameField) {
      inputs = lines.slice(0, 2);
    } else if (rule.applyTo === 'line' && isOrganizationNameField) {
      inputs = lines.slice(0, 1);
    }
    for (const input of inputs) {
      const result = rule.regex.exec(input);
      if (!result) continue;
      const rawValue = readRegexCaptureGroup(result, rule.group);
      if (!rawValue) continue;
      const normalizedValue = normalizeCapturedValue(rawValue, rule.normalize);
      if (!normalizedValue) continue;
      args.onCapture(rule.field, normalizedValue, rule.overwrite);
      matched = true;
      if (!rule.overwrite) break;
    }
  });

  return matched;
};

const buildCaseResolverPartyCandidateFromSegment = (
  segment: PromptExploderSegment,
  role: PromptExploderCaseResolverPartyRole,
  captureRules: CaseResolverSegmentCaptureRule[]
): PromptExploderCaseResolverPartyCandidate | null => {
  const sourceLines = splitSegmentLines(segment);
  if (sourceLines.length === 0) return null;
  const placeDateInLeadingLine =
    sourceLines.length > 1 &&
    (hasCaseResolverPlaceDateSignal(segment) || PLACE_DATE_LINE_RE.test(sourceLines[0] ?? ''));
  const lines = placeDateInLeadingLine ? sourceLines.slice(1) : sourceLines;
  if (lines.length === 0) return null;
  if (isLikelyBodySection(lines) && !isLikelyAddressSegment(lines)) return null;
  const firstLine = lines[0] ?? '';
  const displayName = firstLine || segment.title || role;
  const parsedAddress = extractAddressFields(lines.slice(1));
  const parsedName = parsePersonName(firstLine);
  const inferredKind = inferPartyKindFromLines(lines);
  const roleCaptureRules = captureRules.filter(
    (rule) => rule.role === role || rule.role === 'party'
  );
  const targetedFields = new Set<CaseResolverCaptureField>(
    roleCaptureRules.map((rule) => rule.field)
  );

  const candidate: PromptExploderCaseResolverPartyCandidate = {
    role,
    kind: targetedFields.has('kind') ? undefined : inferredKind,
    displayName,
    rawText: lines.join('\n'),
    sourceSegmentId: segment.id,
    sourceSegmentTitle: segment.title,
    sourcePatternLabels: toSegmentPatternLabels(segment),
    sourceSequenceLabels: toSegmentSequenceLabels(segment),
    street: targetedFields.has('street') ? undefined : parsedAddress.street,
    streetNumber: targetedFields.has('streetNumber') ? undefined : parsedAddress.streetNumber,
    houseNumber: targetedFields.has('houseNumber') ? undefined : parsedAddress.houseNumber,
    city: targetedFields.has('city') ? undefined : parsedAddress.city,
    postalCode: targetedFields.has('postalCode') ? undefined : parsedAddress.postalCode,
    country: targetedFields.has('country') ? undefined : parsedAddress.country,
  };

  if (inferredKind === 'person') {
    if (!targetedFields.has('firstName') && !targetedFields.has('name')) {
      candidate.firstName = parsedName.firstName;
    }
    if (!targetedFields.has('middleName')) {
      candidate.middleName = parsedName.middleName;
    }
    if (!targetedFields.has('lastName')) {
      candidate.lastName = parsedName.lastName;
    }
  }
  if (
    !targetedFields.has('organizationName') &&
    !targetedFields.has('companyName') &&
    inferredKind === 'organization'
  ) {
    candidate.organizationName = firstLine;
  }

  if (targetedFields.size > 0) {
    applySegmentCaptureRules({
      segment,
      rules: roleCaptureRules,
      onCapture: (field, value, overwrite) => {
        applyCaptureFieldToPartyCandidate(candidate, field, value, overwrite);
      },
    });
  }

  if (candidate.kind === 'person') {
    if (!candidate.firstName && parsedName.firstName) {
      candidate.firstName = parsedName.firstName;
    }
    if (!candidate.middleName && parsedName.middleName) {
      candidate.middleName = parsedName.middleName;
    }
    if (!candidate.lastName && parsedName.lastName) {
      candidate.lastName = parsedName.lastName;
    }
  } else {
    if (!candidate.organizationName && firstLine) {
      candidate.organizationName = firstLine;
    }
  }

  if (!candidate.kind) {
    if (candidate.organizationName) {
      candidate.kind = 'organization';
    } else if (candidate.firstName || candidate.lastName) {
      candidate.kind = 'person';
    } else {
      candidate.kind = inferredKind;
    }
  }

  if (!candidate.displayName) {
    if (candidate.organizationName) {
      candidate.displayName = candidate.organizationName;
    } else {
      candidate.displayName = [
        candidate.firstName,
        candidate.middleName,
        candidate.lastName,
      ]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(' ')
        .trim();
    }
  }

  return candidate;
};

const buildCaseResolverPlaceDateCandidate = (
  segments: PromptExploderSegment[],
  captureRules: CaseResolverSegmentCaptureRule[]
): CaseResolverPlaceDateCandidate | null => {
  const placeDateRules = captureRules.filter((rule) => rule.role === 'place_date');
  if (placeDateRules.length === 0) return null;
  const candidate: CaseResolverPlaceDateCandidate = {};
  let hasSourceSegment = false;

  segments.forEach((segment: PromptExploderSegment) => {
    const matched = applySegmentCaptureRules({
      segment,
      rules: placeDateRules,
      onCapture: (field, value, overwrite) => {
        applyCaptureFieldToPlaceDate(candidate, field, value, overwrite);
      },
    });
    if (matched && !hasSourceSegment) {
      hasSourceSegment = true;
      candidate.sourceSegmentId = segment.id;
      candidate.sourceSegmentTitle = segment.title;
      candidate.sourcePatternLabels = toSegmentPatternLabels(segment);
      candidate.sourceSequenceLabels = toSegmentSequenceLabels(segment);
    }
  });

  const hasData = Boolean(
    candidate.city?.trim() ||
    candidate.day?.trim() ||
    candidate.month?.trim() ||
    candidate.year?.trim()
  );
  if (!hasData) return null;

  return candidate;
};

const resolveStructuredPartyRoleForSegment = (
  segment: PromptExploderSegment,
  selection: CaseResolverPartySegmentSelection
): PromptExploderCaseResolverPartyRole | null => {
  const matchedPatternIds = new Set(segment.matchedPatternIds ?? []);
  if (matchedPatternIds.has(CASE_RESOLVER_ADDRESSER_HEADING_PATTERN_ID)) {
    return 'addresser';
  }
  if (matchedPatternIds.has(CASE_RESOLVER_ADDRESSEE_HEADING_PATTERN_ID)) {
    return 'addressee';
  }
  if (segment.id === selection.addresserSegmentId) return 'addresser';
  if (segment.id === selection.addresseeSegmentId) return 'addressee';
  return null;
};

const createStructuredDraftFromSegment = (args: {
  segment: PromptExploderSegment;
  activeValidationScope: 'prompt_exploder' | 'case_resolver_prompt_exploder';
  captureRules: CaseResolverSegmentCaptureRule[];
  selection: CaseResolverPartySegmentSelection;
}): CaseResolverStructuredSegmentDraft | null => {
  if (args.activeValidationScope !== 'case_resolver_prompt_exploder') return null;
  if (args.segment.type !== 'assigned_text') return null;

  const placeDate = buildCaseResolverPlaceDateCandidate([args.segment], args.captureRules);
  if (placeDate) {
    return {
      kind: 'place_date',
      city: placeDate.city ?? '',
      day: placeDate.day ?? '',
      month: placeDate.month ?? '',
      year: placeDate.year ?? '',
    };
  }

  const role = resolveStructuredPartyRoleForSegment(args.segment, args.selection);
  if (!role) return null;
  const partyCandidate = buildCaseResolverPartyCandidateFromSegment(
    args.segment,
    role,
    args.captureRules
  );
  if (!partyCandidate) return null;

  return {
    kind: 'party',
    role,
    companyName: partyCandidate.organizationName ?? '',
    name: partyCandidate.firstName ?? '',
    middleName: partyCandidate.middleName ?? '',
    lastName: partyCandidate.lastName ?? '',
    street: partyCandidate.street ?? '',
    streetNumber: partyCandidate.streetNumber ?? '',
    houseNumber: partyCandidate.houseNumber ?? '',
    postalCode: partyCandidate.postalCode ?? '',
    city: partyCandidate.city ?? '',
    country: partyCandidate.country ?? '',
  };
};

const buildPlaceDateLineFromDraft = (
  draft: Extract<CaseResolverStructuredSegmentDraft, { kind: 'place_date' }>
): string => {
  const city = normalizeText(draft.city);
  const day = normalizeText(draft.day);
  const month = normalizeText(draft.month);
  const year = normalizeText(draft.year);
  const dateParts = [day, month, year].filter((value) => value.length > 0);
  const dateText = dateParts.join('.');
  return [city, dateText].filter((value) => value.length > 0).join(' ').trim();
};

const buildPartyBlockFromDraft = (
  draft: Extract<CaseResolverStructuredSegmentDraft, { kind: 'party' }>
): string => {
  const lines: string[] = [];
  const companyName = normalizeText(draft.companyName);
  const personName = [draft.name, draft.middleName, draft.lastName]
    .map((value: string): string => normalizeText(value))
    .filter((value: string): boolean => value.length > 0)
    .join(' ')
    .trim();

  if (companyName) {
    lines.push(companyName);
    if (personName) lines.push(personName);
  } else if (personName) {
    lines.push(personName);
  }

  const street = normalizeText(draft.street);
  const streetNumber = normalizeText(draft.streetNumber);
  const houseNumber = normalizeText(draft.houseNumber);
  const streetLine = [street, streetNumber].filter((value) => value.length > 0).join(' ').trim();
  if (streetLine) {
    lines.push(houseNumber ? `${streetLine}/${houseNumber}` : streetLine);
  }

  const postalCode = normalizeText(draft.postalCode);
  const city = normalizeText(draft.city);
  const postalCityLine = [postalCode, city].filter((value) => value.length > 0).join(' ').trim();
  if (postalCityLine) {
    lines.push(postalCityLine);
  }

  const country = normalizeText(draft.country);
  if (country) {
    lines.push(country);
  }

  return lines.join('\n').trim();
};

export function AdminPromptExploderPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();

  const [promptText, setPromptText] = useState('');
  const [documentState, setDocumentState] = useState<PromptExploderDocument | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [benchmarkReport, setBenchmarkReport] =
    useState<PromptExploderBenchmarkReport | null>(null);
  const [manualBindings, setManualBindings] = useState<PromptExploderBinding[]>([]);
  const [sessionLearnedRules, setSessionLearnedRules] = useState<PromptValidationRule[]>([]);
  const [sessionLearnedTemplates, setSessionLearnedTemplates] = useState<PromptExploderLearnedTemplate[]>([]);
  const [learningDraft, setLearningDraft] = useState<{
    runtimeRuleProfile: 'all' | 'pattern_pack' | 'learned_only';
    runtimeValidationRuleStack: string;
    enabled: boolean;
    similarityThreshold: number;
    templateMergeThreshold: number;
    benchmarkSuggestionUpsertTemplates: boolean;
    minApprovalsForMatching: number;
    maxTemplates: number;
    autoActivateLearnedTemplates: boolean;
  }>({
    runtimeRuleProfile: 'all',
    runtimeValidationRuleStack: DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
    enabled: true,
    similarityThreshold: 0.68,
    templateMergeThreshold: 0.63,
    benchmarkSuggestionUpsertTemplates: true,
    minApprovalsForMatching: 1,
    maxTemplates: 1000,
    autoActivateLearnedTemplates: true,
  });
  const [benchmarkSuiteDraft, setBenchmarkSuiteDraft] =
    useState<PromptExploderBenchmarkSuite>('default');
  const [benchmarkLowConfidenceThresholdDraft, setBenchmarkLowConfidenceThresholdDraft] =
    useState(PROMPT_EXPLODER_DEFAULT_LOW_CONFIDENCE_THRESHOLD);
  const [benchmarkSuggestionLimitDraft, setBenchmarkSuggestionLimitDraft] =
    useState(PROMPT_EXPLODER_DEFAULT_SUGGESTION_LIMIT);
  const [customBenchmarkCasesDraft, setCustomBenchmarkCasesDraft] = useState('[]');
  const [customCaseDraftId, setCustomCaseDraftId] = useState('');
  const [parserTuningDrafts, setParserTuningDrafts] = useState<
    PromptExploderParserTuningRuleDraft[]
  >([]);
  const [isParserTuningOpen, setIsParserTuningOpen] = useState(false);
  const [dismissedBenchmarkSuggestionIds, setDismissedBenchmarkSuggestionIds] =
    useState<string[]>([]);
  const [snapshotDraftName, setSnapshotDraftName] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [approvalDraft, setApprovalDraft] = useState(
    createApprovalDraftFromSegment(null)
  );
  const [bindingDraft, setBindingDraft] = useState<{
    type: PromptExploderBindingType;
    fromSegmentId: string;
    toSegmentId: string;
    fromSubsectionId: string;
    toSubsectionId: string;
    sourceLabel: string;
    targetLabel: string;
  }>({
    type: 'depends_on',
    fromSegmentId: '',
    toSegmentId: '',
    fromSubsectionId: '',
    toSubsectionId: '',
    sourceLabel: '',
    targetLabel: '',
  });
  const [loadedProjectIdFromQuery, setLoadedProjectIdFromQuery] = useState<string | null>(null);
  const [draggingSegmentId, setDraggingSegmentId] = useState<string | null>(null);
  const [segmentDropTargetId, setSegmentDropTargetId] = useState<string | null>(null);
  const [segmentDropPosition, setSegmentDropPosition] = useState<'before' | 'after' | null>(null);
  const [draggingListItemIndex, setDraggingListItemIndex] = useState<number | null>(null);
  const [listItemDropTargetIndex, setListItemDropTargetIndex] = useState<number | null>(null);
  const [listItemDropPosition, setListItemDropPosition] = useState<'before' | 'after' | null>(null);
  const [incomingBridgeSource, setIncomingBridgeSource] =
    useState<'image-studio' | 'case-resolver' | null>(null);
  const [incomingCaseResolverContext, setIncomingCaseResolverContext] = useState<{
    fileId: string;
    fileName: string;
  } | null>(null);
  const [caseResolverPartySelection, setCaseResolverPartySelection] =
    useState<CaseResolverPartySegmentSelection>(EMPTY_CASE_RESOLVER_PARTY_SELECTION);
  const [selectedCaseResolverStructuredDraft, setSelectedCaseResolverStructuredDraft] =
    useState<CaseResolverStructuredSegmentDraft | null>(null);
  const handledIncomingDraftPayloadRef = useRef<string | null>(null);

  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';
  const requestedProjectId = searchParams?.get('projectId')?.trim() ?? '';
  const returnTarget = returnTo.startsWith('/admin/case-resolver') ? 'case-resolver' : 'image-studio';
  const shouldPreferCaseResolverValidationStack =
    incomingBridgeSource === 'case-resolver' || returnTarget === 'case-resolver';
  const sourceContextLabel = useMemo(() => {
    if (incomingBridgeSource === 'case-resolver') return 'Case Resolver';
    if (incomingBridgeSource === 'image-studio') return 'Image Studio';
    return returnTarget === 'case-resolver' ? 'Case Resolver' : 'Image Studio';
  }, [incomingBridgeSource, returnTarget]);
  const sourceContextDescription = useMemo(() => {
    if (sourceContextLabel !== 'Case Resolver') {
      return `Sent from ${sourceContextLabel}.`;
    }
    const sourceFileName = incomingCaseResolverContext?.fileName.trim();
    if (sourceFileName) {
      return `Sent from Case Resolver: ${sourceFileName}`;
    }
    return 'Sent from Case Resolver.';
  }, [incomingCaseResolverContext?.fileName, sourceContextLabel]);

  const rawPromptSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const rawExploderSettings = settingsQuery.data?.get(PROMPT_EXPLODER_SETTINGS_KEY) ?? null;
  const rawPromptLibrary =
    settingsQuery.data?.get(PROMPT_EXPLODER_LIBRARY_KEY) ?? null;
  const rawValidatorPatternLists =
    settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const promptSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptSettings),
    [rawPromptSettings]
  );
  const promptExploderSettings = useMemo(
    () => parsePromptExploderSettings(rawExploderSettings),
    [rawExploderSettings]
  );
  const promptLibraryState = useMemo(
    () => parsePromptExploderLibrary(rawPromptLibrary),
    [rawPromptLibrary]
  );
  const validatorPatternLists = useMemo(
    () => parseValidatorPatternLists(rawValidatorPatternLists),
    [rawValidatorPatternLists]
  );
  const validationPatternStackOptions = useMemo(
    () => buildPromptExploderValidationRuleStackOptions(validatorPatternLists),
    [validatorPatternLists]
  );
  const promptLibraryItems = useMemo(
    () =>
      sortPromptExploderLibraryItemsByUpdated(promptLibraryState.items),
    [promptLibraryState.items]
  );
  const activeValidationScope = useMemo(
    () => promptExploderValidationScopeFromStack(
      learningDraft.runtimeValidationRuleStack,
      validatorPatternLists
    ),
    [learningDraft.runtimeValidationRuleStack, validatorPatternLists]
  );
  const activeValidatorScope = useMemo(
    () => promptExploderValidatorScopeFromStack(
      learningDraft.runtimeValidationRuleStack,
      validatorPatternLists
    ),
    [learningDraft.runtimeValidationRuleStack, validatorPatternLists]
  );
  const activeValidationStackLabel = useMemo(
    () =>
      validationPatternStackOptions.find(
        (option) => option.value === learningDraft.runtimeValidationRuleStack
      )?.label ?? learningDraft.runtimeValidationRuleStack,
    [learningDraft.runtimeValidationRuleStack, validationPatternStackOptions]
  );

  useEffect(() => {
    const persistedStack = normalizePromptExploderValidationRuleStack(
      promptExploderSettings.runtime.validationRuleStack,
      validatorPatternLists
    );
    const preferredStack = shouldPreferCaseResolverValidationStack
      ? promptExploderValidationStackFromBridgeSource(
        'case-resolver',
        validatorPatternLists
      )
      : persistedStack;
    setLearningDraft({
      runtimeRuleProfile: promptExploderSettings.runtime.ruleProfile,
      runtimeValidationRuleStack: preferredStack,
      enabled: promptExploderSettings.learning.enabled,
      similarityThreshold: promptExploderSettings.learning.similarityThreshold,
      templateMergeThreshold: promptExploderSettings.learning.templateMergeThreshold,
      benchmarkSuggestionUpsertTemplates:
        promptExploderSettings.learning.benchmarkSuggestionUpsertTemplates,
      minApprovalsForMatching: promptExploderSettings.learning.minApprovalsForMatching,
      maxTemplates: promptExploderSettings.learning.maxTemplates,
      autoActivateLearnedTemplates:
        promptExploderSettings.learning.autoActivateLearnedTemplates,
    });
    setBenchmarkSuiteDraft(promptExploderSettings.runtime.benchmarkSuite);
    setBenchmarkLowConfidenceThresholdDraft(
      promptExploderSettings.runtime.benchmarkLowConfidenceThreshold
    );
    setBenchmarkSuggestionLimitDraft(
      promptExploderSettings.runtime.benchmarkSuggestionLimit
    );
    setCustomBenchmarkCasesDraft(
      JSON.stringify(promptExploderSettings.runtime.customBenchmarkCases, null, 2)
    );
  }, [
    promptExploderSettings.runtime.benchmarkLowConfidenceThreshold,
    promptExploderSettings.runtime.benchmarkSuggestionLimit,
    promptExploderSettings.runtime.benchmarkSuite,
    promptExploderSettings.runtime.customBenchmarkCases,
    promptExploderSettings.runtime.ruleProfile,
    promptExploderSettings.runtime.validationRuleStack,
    promptExploderSettings.learning.autoActivateLearnedTemplates,
    promptExploderSettings.learning.benchmarkSuggestionUpsertTemplates,
    promptExploderSettings.learning.enabled,
    promptExploderSettings.learning.maxTemplates,
    promptExploderSettings.learning.minApprovalsForMatching,
    promptExploderSettings.learning.templateMergeThreshold,
    promptExploderSettings.learning.similarityThreshold,
    shouldPreferCaseResolverValidationStack,
    validatorPatternLists,
  ]);

  useEffect(() => {
    setLearningDraft((previous) => {
      const normalizedStack = normalizePromptExploderValidationRuleStack(
        previous.runtimeValidationRuleStack,
        validatorPatternLists
      );
      if (normalizedStack === previous.runtimeValidationRuleStack) {
        return previous;
      }
      return {
        ...previous,
        runtimeValidationRuleStack: normalizedStack,
      };
    });
  }, [validatorPatternLists]);

  const scopedRules = useMemo<PromptValidationRule[]>(
    () => getPromptExploderScopedRules(promptSettings, activeValidationScope),
    [activeValidationScope, promptSettings]
  );
  const parserTuningBaseDrafts = useMemo(
    () =>
      buildPromptExploderParserTuningDrafts({
        scopedRules,
        patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
        scope: activeValidationScope,
      }),
    [activeValidationScope, scopedRules]
  );
  useEffect(() => {
    setParserTuningDrafts(parserTuningBaseDrafts);
  }, [parserTuningBaseDrafts]);
  const effectiveRules = useMemo<PromptValidationRule[]>(() => {
    const byId = new Map<string, PromptValidationRule>();
    [...scopedRules, ...sessionLearnedRules].forEach((rule) => {
      byId.set(rule.id, rule);
    });
    return [...byId.values()];
  }, [scopedRules, sessionLearnedRules]);
  const runtimeValidationRules = useMemo<PromptValidationRule[]>(() => {
    if (learningDraft.runtimeRuleProfile === 'learned_only') {
      return effectiveRules.filter((rule) => rule.id.startsWith('segment.learned.'));
    }
    if (learningDraft.runtimeRuleProfile === 'pattern_pack') {
      return effectiveRules.filter((rule) =>
        PROMPT_EXPLODER_PATTERN_PACK_IDS.has(rule.id)
      );
    }
    return effectiveRules;
  }, [effectiveRules, learningDraft.runtimeRuleProfile]);
  const caseResolverCaptureRules = useMemo<CaseResolverSegmentCaptureRule[]>(
    () =>
      buildCaseResolverSegmentCaptureRules(
        runtimeValidationRules,
        activeValidationScope
      ),
    [activeValidationScope, runtimeValidationRules]
  );
  const effectiveLearnedTemplates = useMemo<PromptExploderLearnedTemplate[]>(() => {
    const byId = new Map<string, PromptExploderLearnedTemplate>();
    [...promptExploderSettings.learning.templates, ...sessionLearnedTemplates].forEach((template) => {
      byId.set(template.id, template);
    });
    return [...byId.values()];
  }, [promptExploderSettings.learning.templates, sessionLearnedTemplates]);

  const selectedSegment = useMemo(() => {
    if (!documentState || !selectedSegmentId) return null;
    return (
      documentState.segments.find((segment) => segment.id === selectedSegmentId) ?? null
    );
  }, [documentState, selectedSegmentId]);
  const selectedParamEntriesState = useMemo<PromptExploderParamEntriesState | null>(() => {
    if (selectedSegment?.type !== 'parameter_block') return null;
    if (!selectedSegment.paramsObject) return null;
    return buildPromptExploderParamEntries({
      paramsObject: selectedSegment.paramsObject,
      paramsText: selectedSegment.paramsText || selectedSegment.text,
      paramUiControls: selectedSegment.paramUiControls ?? null,
      paramComments: selectedSegment.paramComments ?? null,
      paramDescriptions: selectedSegment.paramDescriptions ?? null,
    });
  }, [selectedSegment]);
  const listParamEntriesState = useMemo<PromptExploderParamEntriesState | null>(() => {
    if (!documentState) return null;
    const paramsSegment = documentState.segments.find(
      (segment) => segment.type === 'parameter_block' && Boolean(segment.paramsObject)
    );
    if (!paramsSegment?.paramsObject) return null;
    return buildPromptExploderParamEntries({
      paramsObject: paramsSegment.paramsObject,
      paramsText: paramsSegment.paramsText || paramsSegment.text,
      paramUiControls: paramsSegment.paramUiControls ?? null,
      paramComments: paramsSegment.paramComments ?? null,
      paramDescriptions: paramsSegment.paramDescriptions ?? null,
    });
  }, [documentState]);
  const listParamOptions = useMemo(
    () =>
      (listParamEntriesState?.entries ?? []).map((entry) => ({
        value: entry.path,
        label: entry.path,
      })),
    [listParamEntriesState]
  );
  const listParamEntryByPath = useMemo(() => {
    const map = new Map<string, PromptExploderParamEntry>();
    (listParamEntriesState?.entries ?? []).forEach((entry) => {
      map.set(entry.path, entry);
    });
    return map;
  }, [listParamEntriesState]);
  const explosionMetrics = useMemo(() => {
    if (!documentState) return null;
    const lowConfidenceThreshold = promptExploderClampNumber(
      benchmarkLowConfidenceThresholdDraft,
      0.3,
      0.9
    );
    const segments = documentState.segments;
    const total = segments.length;
    if (total === 0) {
      return {
        total: 0,
        avgConfidence: 0,
        lowConfidenceThreshold,
        lowConfidenceCount: 0,
        typedCoverage: 0,
        typeCounts: {} as Record<string, number>,
      };
    }
    const typeCounts: Record<string, number> = {};
    let confidenceSum = 0;
    let lowConfidenceCount = 0;
    let typedCount = 0;
    segments.forEach((segment) => {
      typeCounts[segment.type] = (typeCounts[segment.type] ?? 0) + 1;
      confidenceSum += segment.confidence;
      if (segment.confidence < lowConfidenceThreshold) lowConfidenceCount += 1;
      if (segment.type !== 'assigned_text') typedCount += 1;
    });
    return {
      total,
      avgConfidence: confidenceSum / total,
      lowConfidenceThreshold,
      lowConfidenceCount,
      typedCoverage: typedCount / total,
      typeCounts,
    };
  }, [benchmarkLowConfidenceThresholdDraft, documentState]);
  const runtimeLearnedTemplates = useMemo<PromptExploderLearnedTemplate[]>(() => {
    if (!learningDraft.enabled) return [];
    return filterTemplatesForRuntime(effectiveLearnedTemplates, {
      minApprovalsForMatching: learningDraft.minApprovalsForMatching,
      maxTemplates: learningDraft.maxTemplates,
    });
  }, [
    effectiveLearnedTemplates,
    learningDraft.enabled,
    learningDraft.maxTemplates,
    learningDraft.minApprovalsForMatching,
  ]);
  const matchedRuleDetails = useMemo(() => {
    if (!selectedSegment) return [];
    const byId = new Map(effectiveRules.map((rule) => [rule.id, rule]));
    return selectedSegment.matchedPatternIds.map((patternId, index) => {
      const rule = byId.get(patternId);
      const storedLabel = selectedSegment.matchedPatternLabels?.[index]?.trim() ?? '';
      const sequenceLabel = rule?.sequenceGroupLabel?.trim() ?? '';
      return {
        id: patternId,
        title: storedLabel || rule?.title || patternId,
        sequenceLabel: sequenceLabel || undefined,
        segmentType: rule?.promptExploderSegmentType ?? null,
        priority: rule?.promptExploderPriority ?? 0,
        confidenceBoost: rule?.promptExploderConfidenceBoost ?? 0,
        treatAsHeading: rule?.promptExploderTreatAsHeading ?? false,
      };
    });
  }, [effectiveRules, selectedSegment]);
  const availableSnapshots = useMemo<PromptExploderPatternSnapshot[]>(() => {
    return [...promptExploderSettings.patternSnapshots].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }, [promptExploderSettings.patternSnapshots]);
  const selectedSnapshot = useMemo(() => {
    if (!selectedSnapshotId) return null;
    return (
      availableSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ??
      null
    );
  }, [availableSnapshots, selectedSnapshotId]);
  const parsedCustomBenchmarkCases = useMemo(
    () => parseCustomBenchmarkCasesDraft(customBenchmarkCasesDraft),
    [customBenchmarkCasesDraft]
  );
  const templateMergeThreshold = promptExploderClampNumber(
    learningDraft.templateMergeThreshold,
    0.3,
    0.95
  );
  const benchmarkSuggestions = useMemo(() => {
    if (!benchmarkReport) return [] as PromptExploderBenchmarkSuggestion[];
    return benchmarkReport.cases.flatMap((caseReport) => caseReport.lowConfidenceSuggestions);
  }, [benchmarkReport]);
  const visibleBenchmarkSuggestions = useMemo(() => {
    if (benchmarkSuggestions.length === 0) return [] as PromptExploderBenchmarkSuggestion[];
    const hiddenIds = new Set(dismissedBenchmarkSuggestionIds);
    return benchmarkSuggestions.filter((suggestion) => !hiddenIds.has(suggestion.id));
  }, [benchmarkSuggestions, dismissedBenchmarkSuggestionIds]);
  const similarTemplateCandidates = useMemo(() => {
    if (!selectedSegment) return [] as Array<{
      id: string;
      title: string;
      segmentType: PromptExploderLearnedTemplate['segmentType'];
      score: number;
      approvals: number;
      state: PromptExploderLearnedTemplate['state'];
      mergeEligible: boolean;
    }>;
    const sourceText = `${selectedSegment.title} ${buildSegmentSampleText(selectedSegment)}`.trim();
    const normalizedSelectedTitle = normalizeLearningText(selectedSegment.title);
    return effectiveLearnedTemplates
      .map((template) => {
        const score = templateSimilarityScore(sourceText, template);
        const sameType = template.segmentType === approvalDraft.ruleSegmentType;
        const mergeEligible = sameType && score >= templateMergeThreshold;
        return {
          id: template.id,
          title: template.title,
          segmentType: template.segmentType,
          score,
          approvals: template.approvals,
          state: template.state,
          mergeEligible,
          sameType,
          normalizedTitle: template.normalizedTitle,
        };
      })
      .filter(
        (candidate) =>
          candidate.score >= promptExploderClampNumber(templateMergeThreshold - 0.1, 0.3, 0.95) ||
          candidate.normalizedTitle === normalizedSelectedTitle
      )
      .sort((left, right) => {
        if (Number(right.mergeEligible) !== Number(left.mergeEligible)) {
          return Number(right.mergeEligible) - Number(left.mergeEligible);
        }
        if (right.score !== left.score) return right.score - left.score;
        if (right.approvals !== left.approvals) return right.approvals - left.approvals;
        return right.id.localeCompare(left.id);
      })
      .slice(0, 6)
      .map(({ sameType: _sameType, normalizedTitle: _normalizedTitle, ...candidate }) => candidate);
  }, [
    approvalDraft.ruleSegmentType,
    effectiveLearnedTemplates,
    selectedSegment,
    templateMergeThreshold,
  ]);
  const templateTargetOptions = useMemo(() => {
    return effectiveLearnedTemplates
      .filter((template) => template.segmentType === approvalDraft.ruleSegmentType)
      .sort((left, right) => {
        if (right.approvals !== left.approvals) {
          return right.approvals - left.approvals;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      })
      .slice(0, 80)
      .map((template) => ({
        value: template.id,
        label: `${template.title} (${template.state}, ${template.approvals})`,
      }));
  }, [approvalDraft.ruleSegmentType, effectiveLearnedTemplates]);

  useEffect(() => {
    setApprovalDraft(createApprovalDraftFromSegment(selectedSegment));
  }, [selectedSegment?.id]);

  useEffect(() => {
    if (availableSnapshots.length === 0) {
      setSelectedSnapshotId('');
      return;
    }
    if (availableSnapshots.some((snapshot) => snapshot.id === selectedSnapshotId)) {
      return;
    }
    setSelectedSnapshotId(availableSnapshots[0]?.id ?? '');
  }, [availableSnapshots, selectedSnapshotId]);

  useEffect(() => {
    if (!draggingSegmentId) return;
    const segmentIds = new Set((documentState?.segments ?? []).map((segment) => segment.id));
    if (segmentIds.has(draggingSegmentId)) return;
    setDraggingSegmentId(null);
    setSegmentDropTargetId(null);
    setSegmentDropPosition(null);
  }, [documentState?.segments, draggingSegmentId]);

  useEffect(() => {
    if (!selectedSegment) {
      setDraggingListItemIndex(null);
      setListItemDropTargetIndex(null);
      setListItemDropPosition(null);
      return;
    }
    if (draggingListItemIndex === null) return;
    if (draggingListItemIndex < selectedSegment.listItems.length) return;
    setDraggingListItemIndex(null);
    setListItemDropTargetIndex(null);
    setListItemDropPosition(null);
  }, [selectedSegment, draggingListItemIndex]);

  const segmentOptions = useMemo(() => {
    return (documentState?.segments ?? []).map((segment) => ({
      value: segment.id,
      label: resolveSegmentDisplayLabel(segment),
    }));
  }, [documentState?.segments]);

  const segmentById = useMemo(() => {
    return new Map((documentState?.segments ?? []).map((segment) => [segment.id, segment]));
  }, [documentState?.segments]);
  const caseResolverPartyCandidates = useMemo<{
    addresser: PromptExploderCaseResolverPartyCandidate | null;
    addressee: PromptExploderCaseResolverPartyCandidate | null;
  }>(() => {
    if (returnTarget !== 'case-resolver' || !documentState) {
      return { addresser: null, addressee: null };
    }
    const addresserSegment = documentState.segments.find(
      (segment: PromptExploderSegment): boolean =>
        segment.id === caseResolverPartySelection.addresserSegmentId
    );
    const addresseeSegment = documentState.segments.find(
      (segment: PromptExploderSegment): boolean =>
        segment.id === caseResolverPartySelection.addresseeSegmentId
    );
    return {
      addresser: addresserSegment
        ? buildCaseResolverPartyCandidateFromSegment(
          addresserSegment,
          'addresser',
          caseResolverCaptureRules
        )
        : null,
      addressee: addresseeSegment
        ? buildCaseResolverPartyCandidateFromSegment(
          addresseeSegment,
          'addressee',
          caseResolverCaptureRules
        )
        : null,
    };
  }, [
    caseResolverCaptureRules,
    caseResolverPartySelection.addresseeSegmentId,
    caseResolverPartySelection.addresserSegmentId,
    documentState,
    returnTarget,
  ]);
  const caseResolverPlaceDateCandidate = useMemo<CaseResolverPlaceDateCandidate | null>(() => {
    if (returnTarget !== 'case-resolver' || !documentState) return null;
    return buildCaseResolverPlaceDateCandidate(
      documentState.segments,
      caseResolverCaptureRules
    );
  }, [caseResolverCaptureRules, documentState, returnTarget]);
  const caseResolverPartyBundle = useMemo<PromptExploderCaseResolverPartyBundle | undefined>(() => {
    const addresser = caseResolverPartyCandidates.addresser;
    const addressee = caseResolverPartyCandidates.addressee;
    if (!addresser && !addressee) return undefined;
    return {
      ...(addresser ? { addresser } : {}),
      ...(addressee ? { addressee } : {}),
    };
  }, [caseResolverPartyCandidates.addressee, caseResolverPartyCandidates.addresser]);
  const caseResolverMetadata = useMemo(() => {
    if (!caseResolverPlaceDateCandidate) return undefined;
    return {
      placeDate: caseResolverPlaceDateCandidate,
    };
  }, [caseResolverPlaceDateCandidate]);

  useEffect(() => {
    if (!selectedSegment) {
      setSelectedCaseResolverStructuredDraft(null);
      return;
    }
    setSelectedCaseResolverStructuredDraft(
      createStructuredDraftFromSegment({
        segment: selectedSegment,
        activeValidationScope,
        captureRules: caseResolverCaptureRules,
        selection: caseResolverPartySelection,
      })
    );
  }, [
    activeValidationScope,
    caseResolverCaptureRules,
    caseResolverPartySelection.addresseeSegmentId,
    caseResolverPartySelection.addresserSegmentId,
    selectedSegment?.id,
  ]);

  const fromSubsectionOptions = useMemo(() => {
    const segment = segmentById.get(bindingDraft.fromSegmentId);
    const options = [{ value: '', label: 'Whole segment' }];
    if (!segment) return options;
    segment.subsections.forEach((subsection) => {
      options.push({
        value: subsection.id,
        label: formatSubsectionLabel(subsection),
      });
    });
    return options;
  }, [bindingDraft.fromSegmentId, segmentById]);

  const toSubsectionOptions = useMemo(() => {
    const segment = segmentById.get(bindingDraft.toSegmentId);
    const options = [{ value: '', label: 'Whole segment' }];
    if (!segment) return options;
    segment.subsections.forEach((subsection) => {
      options.push({
        value: subsection.id,
        label: formatSubsectionLabel(subsection),
      });
    });
    return options;
  }, [bindingDraft.toSegmentId, segmentById]);

  useEffect(() => {
    const draftPayload = readPromptExploderDraftPayload();
    const isPromptExploderDraftPayload =
      draftPayload &&
      (!draftPayload.target || draftPayload.target === 'prompt-exploder');
    const draftPayloadKey = draftPayload
      ? `${draftPayload.source}:${draftPayload.target ?? 'prompt-exploder'}:${draftPayload.createdAt}`
      : null;
    if (
      isPromptExploderDraftPayload &&
      draftPayloadKey &&
      handledIncomingDraftPayloadRef.current !== draftPayloadKey
    ) {
      handledIncomingDraftPayloadRef.current = draftPayloadKey;
      setPromptText(draftPayload.prompt);
      if (draftPayload.source === 'case-resolver' || draftPayload.source === 'image-studio') {
        setIncomingBridgeSource(draftPayload.source);
        if (draftPayload.source === 'case-resolver') {
          setLearningDraft((previous) => ({
            ...previous,
            runtimeValidationRuleStack:
              promptExploderValidationStackFromBridgeSource(
                draftPayload.source,
                validatorPatternLists
              ),
          }));
        }
      } else {
        setIncomingBridgeSource(null);
      }
      setIncomingCaseResolverContext(draftPayload.caseResolverContext ?? null);
      return;
    }

    if (promptText.trim().length > 0) return;
    if (isPromptExploderDraftPayload) return;

    setPromptText('=== PROMPT EXPLODER DEMO ===\n\nROLE\nDefine your role here.\n\nPARAMS\nparams = {\n  "example": true\n}');
  }, [promptText, validatorPatternLists]);

  useEffect(() => {
    if (!requestedProjectId) {
      if (loadedProjectIdFromQuery !== null) {
        setLoadedProjectIdFromQuery(null);
      }
      return;
    }
    if (loadedProjectIdFromQuery === requestedProjectId) return;

    const requestedProject = promptLibraryItems.find(
      (item) => item.id === requestedProjectId
    );
    if (!requestedProject) {
      if (!settingsQuery.isSuccess) return;
      toast('Requested project no longer exists.', { variant: 'warning' });
      setLoadedProjectIdFromQuery(requestedProjectId);
      return;
    }

    const hydratedDocument = hydratePromptExploderLibraryDocument(requestedProject);
    setPromptText(requestedProject.prompt);
    setDocumentState(hydratedDocument);
    setSelectedSegmentId(hydratedDocument?.segments[0]?.id ?? null);
    setManualBindings(getManualBindingsFromDocument(hydratedDocument));
    setBenchmarkReport(null);
    setDismissedBenchmarkSuggestionIds([]);
    setLoadedProjectIdFromQuery(requestedProjectId);
    toast(`Loaded project: ${requestedProject.name}`, { variant: 'success' });
  }, [
    loadedProjectIdFromQuery,
    promptLibraryItems,
    requestedProjectId,
    settingsQuery.isSuccess,
    toast,
  ]);

  useEffect(() => {
    if (returnTarget !== 'case-resolver') return;
    const segments = documentState?.segments ?? [];
    if (segments.length === 0) {
      setCaseResolverPartySelection((previous) =>
        previous.addresserSegmentId || previous.addresseeSegmentId
          ? EMPTY_CASE_RESOLVER_PARTY_SELECTION
          : previous
      );
      return;
    }
    const validIds = new Set(segments.map((segment: PromptExploderSegment): string => segment.id));
    const suggested = suggestCaseResolverPartySegmentIds(
      segments,
      caseResolverCaptureRules
    );
    setCaseResolverPartySelection((previous) => {
      const nextAddresserSegmentId = validIds.has(previous.addresserSegmentId)
        ? previous.addresserSegmentId
        : suggested.addresserSegmentId;
      let nextAddresseeSegmentId = validIds.has(previous.addresseeSegmentId)
        ? previous.addresseeSegmentId
        : suggested.addresseeSegmentId;
      if (
        nextAddresserSegmentId &&
        nextAddresseeSegmentId &&
        nextAddresserSegmentId === nextAddresseeSegmentId
      ) {
        nextAddresseeSegmentId =
          segments.find(
            (segment: PromptExploderSegment): boolean =>
              segment.id !== nextAddresserSegmentId
          )?.id ?? '';
      }
      if (
        nextAddresserSegmentId === previous.addresserSegmentId &&
        nextAddresseeSegmentId === previous.addresseeSegmentId
      ) {
        return previous;
      }
      return {
        addresserSegmentId: nextAddresserSegmentId,
        addresseeSegmentId: nextAddresseeSegmentId,
      };
    });
  }, [caseResolverCaptureRules, documentState?.segments, returnTarget]);

  useEffect(() => {
    const segments = documentState?.segments ?? [];
    const resolved = resolveManualBindingSegmentIds({
      segments,
      fromSegmentId: bindingDraft.fromSegmentId,
      toSegmentId: bindingDraft.toSegmentId,
    });
    if (
      resolved.fromSegmentId === bindingDraft.fromSegmentId &&
      resolved.toSegmentId === bindingDraft.toSegmentId &&
      (segments.length > 0 ||
        (!bindingDraft.fromSubsectionId && !bindingDraft.toSubsectionId))
    ) {
      return;
    }

    setBindingDraft((previous) => ({
      ...previous,
      fromSegmentId: resolved.fromSegmentId,
      toSegmentId: resolved.toSegmentId,
      fromSubsectionId: segments.length === 0 ? '' : previous.fromSubsectionId,
      toSubsectionId: segments.length === 0 ? '' : previous.toSubsectionId,
    }));
  }, [bindingDraft.fromSegmentId, bindingDraft.toSegmentId, documentState?.segments]);

  useEffect(() => {
    if (!documentState) return;
    const resolved = resolveManualBindingSubsectionIds({
      segmentById,
      fromSegmentId: bindingDraft.fromSegmentId,
      toSegmentId: bindingDraft.toSegmentId,
      fromSubsectionId: bindingDraft.fromSubsectionId,
      toSubsectionId: bindingDraft.toSubsectionId,
    });
    if (
      resolved.fromSubsectionId === bindingDraft.fromSubsectionId &&
      resolved.toSubsectionId === bindingDraft.toSubsectionId
    ) {
      return;
    }

    setBindingDraft((previous) => ({
      ...previous,
      fromSubsectionId: resolved.fromSubsectionId,
      toSubsectionId: resolved.toSubsectionId,
    }));
  }, [
    bindingDraft.fromSegmentId,
    bindingDraft.fromSubsectionId,
    bindingDraft.toSegmentId,
    bindingDraft.toSubsectionId,
    documentState,
    segmentById,
  ]);

  const replaceSegments = (segments: PromptExploderSegment[]): void => {
    const normalized = segments.map((segment) => ensureSegmentTitle(segment));
    setDocumentState((current) => {
      if (!current) return current;
      return updatePromptExploderDocument(current, normalized, manualBindings);
    });
  };

  const updateSegment = (segmentId: string, updater: (segment: PromptExploderSegment) => PromptExploderSegment): void => {
    setDocumentState((current) => {
      if (!current) return current;
      const nextSegments = current.segments.map((segment) =>
        segment.id === segmentId ? ensureSegmentTitle(updater(segment)) : segment
      );
      return updatePromptExploderDocument(current, nextSegments, manualBindings);
    });
  };

  const patchSelectedCaseResolverStructuredDraft = (
    updater: (draft: CaseResolverStructuredSegmentDraft) => CaseResolverStructuredSegmentDraft
  ): void => {
    if (!selectedSegment) return;
    setSelectedCaseResolverStructuredDraft((previous) => {
      if (!previous) return previous;
      const nextDraft = updater(previous);
      const nextText =
        nextDraft.kind === 'place_date'
          ? buildPlaceDateLineFromDraft(nextDraft)
          : buildPartyBlockFromDraft(nextDraft);
      updateSegment(selectedSegment.id, (current) => ({
        ...current,
        text: nextText,
        raw: nextText,
      }));
      return nextDraft;
    });
  };

  const rebuildParameterSegment = (
    segment: PromptExploderSegment,
    nextParamsObject: Record<string, unknown>,
    overrides?: {
      paramUiControls?: Record<string, PromptExploderParamUiControl>;
      paramComments?: Record<string, string>;
      paramDescriptions?: Record<string, string>;
      preserveCurrentText?: boolean;
    }
  ): PromptExploderSegment => {
    const nextParamState = buildPromptExploderParamEntries({
      paramsObject: nextParamsObject,
      paramsText: segment.paramsText || segment.text,
      paramUiControls: (overrides?.paramUiControls ?? segment.paramUiControls) ?? null,
      paramComments: (overrides?.paramComments ?? segment.paramComments) ?? null,
      paramDescriptions: (overrides?.paramDescriptions ?? segment.paramDescriptions) ?? null,
    });
    const nextParamsText = overrides?.preserveCurrentText
      ? segment.paramsText || segment.text
      : renderPromptExploderParamsText({
        paramsObject: nextParamsObject,
        paramComments: nextParamState.paramComments,
        paramDescriptions: nextParamState.paramDescriptions,
        fallbackText: segment.paramsText || segment.text,
      });

    return {
      ...segment,
      paramsObject: nextParamsObject,
      paramsText: nextParamsText,
      text: nextParamsText,
      raw: nextParamsText,
      paramUiControls: nextParamState.paramUiControls,
      paramComments: nextParamState.paramComments,
      paramDescriptions: nextParamState.paramDescriptions,
    };
  };

  const updateParameterValue = (
    segmentId: string,
    path: string,
    nextValue: unknown
  ): void => {
    updateSegment(segmentId, (current) => {
      if (!current.paramsObject) return current;
      const nextParamsObject = setDeepValue(current.paramsObject, path, nextValue);
      return rebuildParameterSegment(current, nextParamsObject);
    });
  };

  const updateParameterSelector = (
    segmentId: string,
    path: string,
    selector: string
  ): void => {
    if (!isPromptExploderParamUiControl(selector)) return;
    updateSegment(segmentId, (current) => {
      const nextParamUiControls = setParamUiControlForPath(current.paramUiControls, path, selector);
      if (!current.paramsObject) {
        return {
          ...current,
          paramUiControls: nextParamUiControls,
        };
      }
      return rebuildParameterSegment(current, current.paramsObject, {
        paramUiControls: nextParamUiControls,
      });
    });
  };

  const updateParameterComment = (
    segmentId: string,
    path: string,
    comment: string
  ): void => {
    updateSegment(segmentId, (current) => {
      const nextParamComments = setParamTextMetaForPath(current.paramComments, path, comment);
      if (!current.paramsObject) {
        return {
          ...current,
          paramComments: nextParamComments,
        };
      }
      return rebuildParameterSegment(current, current.paramsObject, {
        paramComments: nextParamComments,
      });
    });
  };

  const updateParameterDescription = (
    segmentId: string,
    path: string,
    description: string
  ): void => {
    updateSegment(segmentId, (current) => {
      const nextParamDescriptions = setParamTextMetaForPath(
        current.paramDescriptions,
        path,
        description
      );
      if (!current.paramsObject) {
        return {
          ...current,
          paramDescriptions: nextParamDescriptions,
        };
      }
      return rebuildParameterSegment(current, current.paramsObject, {
        paramDescriptions: nextParamDescriptions,
      });
    });
  };

  const normalizeLogicalConditionList = (
    item: PromptExploderListItem,
    sourceConditions: PromptExploderLogicalCondition[],
    logicalOperator: PromptExploderLogicalOperator
  ): PromptExploderLogicalCondition[] => {
    const fallbackComparator: PromptExploderLogicalComparator =
      logicalOperator === 'unless' ? 'falsy' : 'truthy';
    const baseConditions = sourceConditions.length
      ? sourceConditions
      : [
        createLogicalCondition({
          id: `${item.id}_condition_1`,
          comparator: fallbackComparator,
          value: null,
        }),
      ];

    return baseConditions.map((condition, index) => {
      const comparator = condition.comparator ?? fallbackComparator;
      return createLogicalCondition({
        id: condition.id || `${item.id}_condition_${index + 1}`,
        paramPath: (condition.paramPath ?? '').trim(),
        comparator,
        value:
          comparator === 'truthy' || comparator === 'falsy'
            ? null
            : condition.value ?? null,
        joinWithPrevious:
          index === 0
            ? null
            : (condition.joinWithPrevious === 'or' ? 'or' : 'and'),
      });
    });
  };

  const deriveLegacyLogicalConditions = (
    item: PromptExploderListItem
  ): PromptExploderLogicalCondition[] => {
    const legacyPath = (item.referencedParamPath ?? '').trim();
    if (!legacyPath) return [];
    return [
      createLogicalCondition({
        id: `${item.id}_legacy`,
        paramPath: legacyPath,
        comparator:
          item.referencedComparator ??
          (item.logicalOperator === 'unless' ? 'falsy' : 'truthy'),
        value: item.referencedValue ?? null,
        joinWithPrevious: null,
      }),
    ];
  };

  const getEditableLogicalConditions = (
    item: PromptExploderListItem
  ): PromptExploderLogicalCondition[] => {
    if ((item.logicalConditions ?? []).length > 0) {
      return item.logicalConditions ?? [];
    }
    const legacy = deriveLegacyLogicalConditions(item);
    if (legacy.length > 0) return legacy;
    if (item.logicalOperator) {
      return [
        createLogicalCondition({
          id: `${item.id}_condition_1`,
          comparator: item.logicalOperator === 'unless' ? 'falsy' : 'truthy',
          joinWithPrevious: null,
        }),
      ];
    }
    return [];
  };

  const normalizeListItemLogicalState = (
    item: PromptExploderListItem,
    override: Partial<PromptExploderListItem>
  ): PromptExploderListItem => {
    const next = {
      ...item,
      ...override,
    };
    const logicalOperator = next.logicalOperator ?? null;
    if (!logicalOperator) {
      return {
        ...next,
        logicalOperator: null,
        logicalConditions: [],
        referencedParamPath: null,
        referencedComparator: null,
        referencedValue: null,
      };
    }

    const sourcedConditions =
      override.logicalConditions !== undefined
        ? (override.logicalConditions ?? [])
        : ((next.logicalConditions ?? []).length > 0
          ? (next.logicalConditions ?? [])
          : deriveLegacyLogicalConditions(next));

    const logicalConditions = normalizeLogicalConditionList(
      next,
      sourcedConditions,
      logicalOperator
    );

    const firstConfiguredCondition =
      logicalConditions.find((condition) => condition.paramPath.trim().length > 0) ?? null;

    return {
      ...next,
      logicalOperator,
      logicalConditions,
      referencedParamPath: firstConfiguredCondition?.paramPath ?? null,
      referencedComparator: firstConfiguredCondition?.comparator ?? null,
      referencedValue:
        firstConfiguredCondition &&
          firstConfiguredCondition.comparator !== 'truthy' &&
          firstConfiguredCondition.comparator !== 'falsy'
          ? firstConfiguredCondition.value
          : null,
    };
  };

  const updateTopLevelListItem = (
    segmentId: string,
    index: number,
    updater: (item: PromptExploderListItem) => PromptExploderListItem
  ): void => {
    updateSegment(segmentId, (current) => ({
      ...current,
      listItems: updateListItemAt(current.listItems, index, updater),
    }));
  };

  const renderListItemLogicalEditor = (args: {
    item: PromptExploderListItem;
    onChange: (updater: (item: PromptExploderListItem) => PromptExploderListItem) => void;
  }): React.JSX.Element => {
    const { item, onChange } = args;
    const operatorValue = item.logicalOperator ?? 'none';
    const logicalConditions =
      operatorValue === 'none' ? [] : getEditableLogicalConditions(item);

    const applyPatch = (patch: Partial<PromptExploderListItem>): void => {
      onChange((current) => normalizeListItemLogicalState(current, patch));
    };

    const updateCondition = (
      conditionIndex: number,
      patch: Partial<PromptExploderLogicalCondition>
    ): void => {
      const nextConditions = logicalConditions.map((condition, index) =>
        index === conditionIndex ? createLogicalCondition({ ...condition, ...patch }) : condition
      );
      applyPatch({
        logicalConditions: nextConditions,
      });
    };

    const addCondition = (): void => {
      if (operatorValue === 'none') return;
      const fallbackComparator: PromptExploderLogicalComparator =
        operatorValue === 'unless' ? 'falsy' : 'truthy';
      applyPatch({
        logicalConditions: [
          ...logicalConditions,
          createLogicalCondition({
            comparator: fallbackComparator,
            joinWithPrevious: 'and',
          }),
        ],
      });
    };

    const removeCondition = (conditionIndex: number): void => {
      const nextConditions = logicalConditions.filter((_, index) => index !== conditionIndex);
      applyPatch({
        logicalConditions: nextConditions,
      });
    };

    return (
      <div className='mt-2 space-y-2 rounded border border-border/50 bg-card/20 p-2'>
        <div className='space-y-1'>
          <Label className='text-[10px] text-gray-500'>Logical Operator</Label>
          <SelectSimple
            size='sm'
            value={operatorValue}
            onValueChange={(next: string) => {
              if (next === 'none') {
                applyPatch({
                  logicalOperator: null,
                  logicalConditions: [],
                  referencedParamPath: null,
                  referencedComparator: null,
                  referencedValue: null,
                });
                return;
              }
              const nextOperator = next as PromptExploderLogicalOperator;
              applyPatch({
                logicalOperator: nextOperator,
              });
            }}
            options={PROMPT_EXPLODER_LOGICAL_OPERATOR_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </div>

        {operatorValue !== 'none' ? (
          <div className='space-y-2'>
            {logicalConditions.map((condition, conditionIndex) => {
              const selectedParamPath = (condition.paramPath ?? '').trim();
              const selectedParamEntry = selectedParamPath
                ? (listParamEntryByPath.get(selectedParamPath) ?? null)
                : null;
              const comparatorValue =
                condition.comparator ?? (operatorValue === 'unless' ? 'falsy' : 'truthy');
              const needsValue =
                selectedParamPath.length > 0 &&
                comparatorValue !== 'truthy' &&
                comparatorValue !== 'falsy';
              const paramOptions =
                selectedParamPath &&
                  !listParamOptions.some((option) => option.value === selectedParamPath)
                  ? [{ value: selectedParamPath, label: selectedParamPath }, ...listParamOptions]
                  : listParamOptions;

              return (
                <div
                  key={condition.id}
                  className='grid gap-2 md:grid-cols-[120px_minmax(0,1fr)_120px_minmax(0,1fr)_64px]'
                >
                  <div className='space-y-1'>
                    <Label className='text-[10px] text-gray-500'>Join</Label>
                    {conditionIndex === 0 ? (
                      <div className='h-9 rounded border border-dashed border-border/60 bg-card/20 px-2 text-[11px] leading-9 text-gray-500'>
                        START
                      </div>
                    ) : (
                      <SelectSimple
                        size='sm'
                        value={condition.joinWithPrevious === 'or' ? 'or' : 'and'}
                        onValueChange={(next: string) => {
                          if (!isLogicalJoin(next)) return;
                          updateCondition(conditionIndex, {
                            joinWithPrevious: next,
                          });
                        }}
                        options={PROMPT_EXPLODER_LOGICAL_JOIN_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                      />
                    )}
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[10px] text-gray-500'>Referenced Param</Label>
                    <SelectSimple
                      size='sm'
                      value={selectedParamPath}
                      onValueChange={(next: string) => {
                        updateCondition(conditionIndex, {
                          paramPath: next.trim(),
                        });
                      }}
                      options={
                        paramOptions.length > 0
                          ? paramOptions
                          : [{ value: '', label: 'No parameters available' }]
                      }
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[10px] text-gray-500'>Comparator</Label>
                    <SelectSimple
                      size='sm'
                      value={comparatorValue}
                      onValueChange={(next: string) => {
                        if (!isLogicalComparator(next)) return;
                        updateCondition(conditionIndex, {
                          comparator: next,
                          value:
                            next === 'truthy' || next === 'falsy'
                              ? null
                              : condition.value ?? null,
                        });
                      }}
                      options={PROMPT_EXPLODER_LOGICAL_COMPARATOR_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[10px] text-gray-500'>Value</Label>
                    {needsValue ? (
                      selectedParamEntry?.spec?.kind === 'boolean' ? (
                        <SelectSimple
                          size='sm'
                          value={String(Boolean(condition.value))}
                          onValueChange={(next: string) => {
                            updateCondition(conditionIndex, {
                              value: next === 'true',
                            });
                          }}
                          options={[
                            { value: 'true', label: 'true' },
                            { value: 'false', label: 'false' },
                          ]}
                        />
                      ) : selectedParamEntry?.spec?.kind === 'enum' &&
                        selectedParamEntry.spec.enumOptions ? (
                          <SelectSimple
                            size='sm'
                            value={String(condition.value ?? selectedParamEntry.spec.enumOptions[0] ?? '')}
                            onValueChange={(next: string) => {
                              updateCondition(conditionIndex, {
                                value: next,
                              });
                            }}
                            options={selectedParamEntry.spec.enumOptions.map((value) => ({
                              value,
                              label: value,
                            }))}
                          />
                        ) : selectedParamEntry?.spec?.kind === 'number' ? (
                          <Input
                            type='number'
                            value={String(condition.value ?? '')}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              if (!Number.isFinite(next)) return;
                              updateCondition(conditionIndex, {
                                value: next,
                              });
                            }}
                          />
                        ) : (
                          <Input
                            value={
                              typeof condition.value === 'string'
                                ? condition.value
                                : promptExploderSafeJsonStringify(condition.value ?? '')
                            }
                            onChange={(event) => {
                              const rawValue = event.target.value;
                              if (
                                selectedParamEntry?.spec?.kind === 'rgb' ||
                                selectedParamEntry?.spec?.kind === 'tuple2' ||
                                selectedParamEntry?.spec?.kind === 'json'
                              ) {
                                updateCondition(conditionIndex, {
                                  value: sanitizeParamJsonValue(
                                    rawValue,
                                    condition.value
                                  ),
                                });
                                return;
                              }
                              updateCondition(conditionIndex, {
                                value: rawValue,
                              });
                            }}
                          />
                        )
                    ) : (
                      <div className='h-9 rounded border border-dashed border-border/60 bg-card/20 px-2 text-[11px] leading-9 text-gray-500'>
                        {selectedParamPath ? 'Value not needed' : 'Select parameter'}
                      </div>
                    )}
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[10px] text-gray-500'>Actions</Label>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-9 w-full px-2'
                      onClick={() => {
                        removeCondition(conditionIndex);
                      }}
                      disabled={logicalConditions.length <= 1}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              );
            })}
            <div className='flex justify-end'>
              <Button
                type='button'
                variant='outline'
                className='h-8 px-2 text-xs'
                onClick={addCondition}
              >
                <Plus className='mr-1 size-3.5' />
                Add condition
              </Button>
            </div>
          </div>
        ) : (
          <div className='h-9 rounded border border-dashed border-border/60 bg-card/20 px-2 text-[11px] leading-9 text-gray-500'>
            No condition
          </div>
        )}
      </div>
    );
  };

  const syncManualBindings = (nextManualBindings: PromptExploderBinding[]): void => {
    setManualBindings(nextManualBindings);
    setDocumentState((current) => {
      if (!current) return current;
      return updatePromptExploderDocument(current, current.segments, nextManualBindings);
    });
  };

  const updateListItemAt = (
    items: PromptExploderListItem[],
    index: number,
    updater: (item: PromptExploderListItem) => PromptExploderListItem
  ): PromptExploderListItem[] => {
    return items.map((item, itemIndex) =>
      itemIndex === index ? updater(item) : item
    );
  };

  const resolveSegmentDropPosition = (
    event: React.DragEvent<HTMLDivElement>
  ): 'before' | 'after' => {
    const rect = event.currentTarget.getBoundingClientRect();
    return resolveDropPosition(event.clientY, rect.top, rect.height);
  };

  const handleListItemDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    index: number
  ): void => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/prompt-exploder-list-item-index', String(index));
    setDraggingListItemIndex(index);
    setListItemDropTargetIndex(null);
    setListItemDropPosition(null);
  };

  const handleListItemDragEnd = (): void => {
    setDraggingListItemIndex(null);
    setListItemDropTargetIndex(null);
    setListItemDropPosition(null);
  };

  const handleListItemDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetIndex: number
  ): void => {
    if (draggingListItemIndex === null) return;
    if (draggingListItemIndex === targetIndex) {
      setListItemDropTargetIndex(null);
      setListItemDropPosition(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const position = resolveSegmentDropPosition(event);
    setListItemDropTargetIndex(targetIndex);
    setListItemDropPosition(position);
  };

  const handleListItemDrop = (
    event: React.DragEvent<HTMLDivElement>,
    segmentId: string,
    targetIndex: number
  ): void => {
    event.preventDefault();
    const fallbackIndex = Number.parseInt(
      event.dataTransfer.getData('text/prompt-exploder-list-item-index'),
      10
    );
    const draggedIndex =
      draggingListItemIndex ?? (Number.isNaN(fallbackIndex) ? null : fallbackIndex);
    if (draggedIndex === null || draggedIndex === targetIndex) {
      handleListItemDragEnd();
      return;
    }

    const position = resolveSegmentDropPosition(event);
    updateSegment(segmentId, (current) => ({
      ...current,
      listItems: reorderListItemsForDrop(current.listItems, draggedIndex, targetIndex, position),
    }));
    handleListItemDragEnd();
  };

  const handleSegmentDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    segmentId: string
  ): void => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', segmentId);
    setDraggingSegmentId(segmentId);
    setSegmentDropTargetId(null);
    setSegmentDropPosition(null);
  };

  const handleSegmentDragEnd = (): void => {
    setDraggingSegmentId(null);
    setSegmentDropTargetId(null);
    setSegmentDropPosition(null);
  };

  const handleSegmentDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetId: string
  ): void => {
    if (!draggingSegmentId) return;
    if (draggingSegmentId === targetId) {
      setSegmentDropTargetId(null);
      setSegmentDropPosition(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const position = resolveSegmentDropPosition(event);
    setSegmentDropTargetId(targetId);
    setSegmentDropPosition(position);
  };

  const handleSegmentDrop = (
    event: React.DragEvent<HTMLDivElement>,
    targetId: string
  ): void => {
    event.preventDefault();
    const draggedId =
      draggingSegmentId || event.dataTransfer.getData('text/plain');
    if (!draggedId || !documentState || draggedId === targetId) {
      handleSegmentDragEnd();
      return;
    }

    const position = resolveSegmentDropPosition(event);
    const nextSegments = reorderSegmentsForDrop(
      documentState.segments,
      draggedId,
      targetId,
      position
    );
    if (nextSegments !== documentState.segments) {
      replaceSegments(nextSegments);
    }
    handleSegmentDragEnd();
  };

  const handleExplode = (): void => {
    const trimmed = promptText.trim();
    if (!trimmed) {
      toast('Enter a prompt first.', { variant: 'info' });
      return;
    }

    const nextDocument = explodePromptText({
      prompt: trimmed,
      validationRules: runtimeValidationRules,
      learnedTemplates: runtimeLearnedTemplates,
      similarityThreshold: promptExploderClampNumber(learningDraft.similarityThreshold, 0.3, 0.95),
      validationScope: activeValidationScope,
    });

    setManualBindings([]);
    setDocumentState(nextDocument);
    setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);

    toast(`Exploded into ${nextDocument.segments.length} segment(s).`, { variant: 'success' });
  };

  const upsertCustomBenchmarkCaseDraft = (
    nextCase: PromptExploderBenchmarkCase
  ): void => {
    const parsed = parseCustomBenchmarkCasesDraft(customBenchmarkCasesDraft);
    if (!parsed.ok) {
      toast(`Custom benchmark JSON is invalid: ${parsed.error}`, { variant: 'error' });
      return;
    }
    const nextCases = upsertCustomBenchmarkCase(parsed.cases, nextCase);
    setCustomBenchmarkCasesDraft(JSON.stringify(nextCases, null, 2));
    setBenchmarkSuiteDraft('custom');
    toast(`Custom benchmark case upserted: ${nextCase.id}`, { variant: 'success' });
  };

  const handleAddCurrentPromptAsCustomBenchmarkCase = (): void => {
    const prompt = promptText.trim();
    if (!prompt) {
      toast('Source prompt is empty.', { variant: 'info' });
      return;
    }
    const defaultCaseId = defaultCustomBenchmarkCaseIdFromPrompt(prompt);
    const caseId = customCaseDraftId.trim() || defaultCaseId;

    const expectedTypes = (documentState?.segments.length
      ? [...new Set(documentState.segments.map((segment) => segment.type))]
      : ['assigned_text']) as PromptExploderSegment['type'][];
    const minSegments = Math.max(1, documentState?.segments.length ?? 1);

    upsertCustomBenchmarkCaseDraft({
      id: caseId,
      prompt,
      expectedTypes,
      minSegments,
    });
  };

  const handleClearCustomBenchmarkCases = (): void => {
    setCustomBenchmarkCasesDraft('[]');
    toast('Custom benchmark cases cleared.', { variant: 'info' });
  };

  const handleLoadCustomBenchmarkTemplate = (
    suite: 'default' | 'extended'
  ): void => {
    const templateCases =
      suite === 'extended'
        ? EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES
        : DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES;
    setCustomBenchmarkCasesDraft(JSON.stringify(templateCases, null, 2));
    setBenchmarkSuiteDraft('custom');
    toast(
      `Loaded ${suite} benchmark template into custom suite (${templateCases.length} case(s)).`,
      { variant: 'success' }
    );
  };

  const handleAppendBenchmarkTemplateToCustom = (
    suite: 'default' | 'extended'
  ): void => {
    const parsed = parseCustomBenchmarkCasesDraft(customBenchmarkCasesDraft);
    if (!parsed.ok) {
      toast(`Custom benchmark JSON is invalid: ${parsed.error}`, { variant: 'error' });
      return;
    }
    const templateCases =
      suite === 'extended'
        ? EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES
        : DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES;
    const nextCases = mergeCustomBenchmarkCases(parsed.cases, templateCases);
    setCustomBenchmarkCasesDraft(JSON.stringify(nextCases, null, 2));
    setBenchmarkSuiteDraft('custom');
    toast(
      `Appended ${suite} template into custom suite. Total custom cases: ${nextCases.length}.`,
      { variant: 'success' }
    );
  };

  const handleRunBenchmark = (): void => {
    let customCases: PromptExploderBenchmarkCase[] | null = null;
    if (benchmarkSuiteDraft === 'custom') {
      if (!parsedCustomBenchmarkCases.ok) {
        toast(`Custom benchmark JSON is invalid: ${parsedCustomBenchmarkCases.error}`, {
          variant: 'error',
        });
        return;
      }
      if (parsedCustomBenchmarkCases.cases.length === 0) {
        toast('Add at least one custom benchmark case before running.', {
          variant: 'info',
        });
        return;
      }
      customCases = parsedCustomBenchmarkCases.cases;
    }

    const benchmarkLowConfidenceThreshold = promptExploderClampNumber(
      benchmarkLowConfidenceThresholdDraft,
      0.3,
      0.9
    );
    const benchmarkSuggestionLimit = promptExploderClampNumber(
      Math.floor(benchmarkSuggestionLimitDraft),
      1,
      20
    );
    const report = runPromptExploderBenchmark({
      validationRules: runtimeValidationRules,
      learnedTemplates: runtimeLearnedTemplates,
      similarityThreshold: promptExploderClampNumber(learningDraft.similarityThreshold, 0.3, 0.95),
      validationScope: activeValidationScope,
      suite: benchmarkSuiteDraft === 'extended' ? 'extended' : 'default',
      lowConfidenceThreshold: benchmarkLowConfidenceThreshold,
      suggestionLimit: benchmarkSuggestionLimit,
      cases: customCases,
    });
    setBenchmarkReport(report);
    setDismissedBenchmarkSuggestionIds([]);
    const recallPercent = (report.aggregate.expectedTypeRecall * 100).toFixed(1);
    toast(
      `Benchmark (${promptExploderBenchmarkSuiteLabel(report.suite)}) completed. Expected-type recall: ${recallPercent}%`,
      {
        variant:
          report.aggregate.expectedTypeRecall >= PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET
            ? 'success'
            : 'warning',
      }
    );
  };

  const patchParserTuningDraft = (
    ruleId: PromptExploderParserTuningRuleDraft['id'],
    patch: Partial<PromptExploderParserTuningRuleDraft>
  ): void => {
    setParserTuningDrafts((previous) =>
      previous.map((draft) =>
        draft.id === ruleId
          ? {
            ...draft,
            ...patch,
          }
          : draft
      )
    );
  };

  const handleResetParserTuningDrafts = (): void => {
    setParserTuningDrafts(
      buildPromptExploderParserTuningDrafts({
        scopedRules: PROMPT_EXPLODER_PATTERN_PACK,
        patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
        scope: activeValidationScope,
      })
    );
    toast('Parser tuning drafts reset to pattern-pack defaults.', { variant: 'info' });
  };

  const handleSaveParserTuningRules = async (): Promise<void> => {
    const validation = validatePromptExploderParserTuningDrafts(parserTuningDrafts);
    if (!validation.ok) {
      toast(validation.error, { variant: 'error' });
      return;
    }
    try {
      const nextSettings = applyPromptExploderParserTuningDrafts({
        settings: promptSettings,
        drafts: parserTuningDrafts,
        patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
        scope: activeValidationScope,
      });
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      toast('Prompt Exploder parser tuning rules saved.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save parser tuning rules.',
        { variant: 'error' }
      );
    }
  };

  const handleSaveLearningSettings = async (): Promise<void> => {
    try {
      let persistedCustomCases = promptExploderSettings.runtime.customBenchmarkCases;
      if (benchmarkSuiteDraft === 'custom') {
        if (!parsedCustomBenchmarkCases.ok) {
          toast(`Custom benchmark JSON is invalid: ${parsedCustomBenchmarkCases.error}`, {
            variant: 'error',
          });
          return;
        }
        if (parsedCustomBenchmarkCases.cases.length === 0) {
          toast('Custom suite selected but no custom cases are defined.', {
            variant: 'info',
          });
          return;
        }
        persistedCustomCases = parsedCustomBenchmarkCases.cases;
      }

      const nextSettings = {
        ...promptExploderSettings,
        runtime: {
          ...promptExploderSettings.runtime,
          ruleProfile: learningDraft.runtimeRuleProfile,
          validationRuleStack: normalizePromptExploderValidationRuleStack(
            learningDraft.runtimeValidationRuleStack,
            validatorPatternLists
          ),
          benchmarkSuite: benchmarkSuiteDraft,
          benchmarkLowConfidenceThreshold: promptExploderClampNumber(
            benchmarkLowConfidenceThresholdDraft,
            0.3,
            0.9
          ),
          benchmarkSuggestionLimit: promptExploderClampNumber(
            Math.floor(benchmarkSuggestionLimitDraft),
            1,
            20
          ),
          customBenchmarkCases: persistedCustomCases,
        },
        learning: {
          ...promptExploderSettings.learning,
          enabled: learningDraft.enabled,
          similarityThreshold: promptExploderClampNumber(learningDraft.similarityThreshold, 0.3, 0.95),
          templateMergeThreshold: promptExploderClampNumber(
            learningDraft.templateMergeThreshold,
            0.3,
            0.95
          ),
          benchmarkSuggestionUpsertTemplates:
            learningDraft.benchmarkSuggestionUpsertTemplates,
          minApprovalsForMatching: promptExploderClampNumber(
            Math.floor(learningDraft.minApprovalsForMatching),
            1,
            20
          ),
          maxTemplates: promptExploderClampNumber(Math.floor(learningDraft.maxTemplates), 50, 5000),
          autoActivateLearnedTemplates: learningDraft.autoActivateLearnedTemplates,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      toast('Prompt Exploder runtime + learning settings saved.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save Prompt Exploder learning settings.',
        { variant: 'error' }
      );
    }
  };

  const handleCapturePatternSnapshot = async (): Promise<void> => {
    try {
      const scopedPromptRules = promptSettings.promptValidation.rules.filter((rule) => {
        if (!isPromptExploderManagedRule(rule)) return false;
        const scopes = rule.appliesToScopes ?? [];
        return (
          scopes.length === 0 ||
          scopes.includes(activeValidationScope) ||
          scopes.includes('global')
        );
      });
      const now = new Date().toISOString();
      const snapshot = buildPatternSnapshot({
        rules: scopedPromptRules,
        snapshotDraftName,
        now,
      });
      const nextSettings = {
        ...promptExploderSettings,
        patternSnapshots: prependPatternSnapshot(
          promptExploderSettings.patternSnapshots,
          snapshot,
          40
        ),
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setSnapshotDraftName('');
      setSelectedSnapshotId(snapshot.id);
      toast(`Snapshot saved (${snapshot.ruleCount} rules).`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to capture Prompt Exploder snapshot.',
        { variant: 'error' }
      );
    }
  };

  const handleRestorePatternSnapshot = async (): Promise<void> => {
    if (!selectedSnapshot) {
      toast('Select a snapshot to restore.', { variant: 'info' });
      return;
    }
    const parsed = parsePromptValidationRules(selectedSnapshot.rulesJson);
    if (!parsed.ok) {
      toast(`Snapshot is invalid: ${parsed.error}`, { variant: 'error' });
      return;
    }
    try {
      const basePromptSettings = promptSettings.promptValidation
        ? promptSettings
        : defaultPromptEngineSettings;
      const restoredRules = mergeRestoredPromptExploderRules({
        existingRules: basePromptSettings.promptValidation.rules,
        restoredRules: parsed.rules,
        isPromptExploderManagedRule: isPromptExploderManagedRule,
        scope: activeValidationScope,
      });
      const nextPromptSettings = {
        ...basePromptSettings,
        promptValidation: {
          ...basePromptSettings.promptValidation,
          rules: restoredRules,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextPromptSettings),
      });
      toast(
        `Snapshot restored: ${selectedSnapshot.name} (${parsed.rules.length} rules).`,
        { variant: 'success' }
      );
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to restore Prompt Exploder snapshot.',
        { variant: 'error' }
      );
    }
  };

  const handleDeletePatternSnapshot = async (): Promise<void> => {
    if (!selectedSnapshot) {
      toast('Select a snapshot to delete.', { variant: 'info' });
      return;
    }
    try {
      const nextSettings = {
        ...promptExploderSettings,
        patternSnapshots: removePatternSnapshotById(
          promptExploderSettings.patternSnapshots,
          selectedSnapshot.id
        ),
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      toast(`Deleted snapshot: ${selectedSnapshot.name}`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to delete snapshot.',
        { variant: 'error' }
      );
    }
  };

  const handleTemplateStateChange = async (
    templateId: string,
    nextState: PromptExploderLearnedTemplate['state']
  ): Promise<void> => {
    try {
      const nextTemplates = promptExploderSettings.learning.templates.map((template) =>
        template.id === templateId
          ? {
            ...template,
            state: nextState,
            updatedAt: new Date().toISOString(),
          }
          : template
      );
      const nextSettings = {
        ...promptExploderSettings,
        learning: {
          ...promptExploderSettings.learning,
          templates: nextTemplates,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setSessionLearnedTemplates((previous) =>
        previous.map((template) =>
          template.id === templateId
            ? {
              ...template,
              state: nextState,
              updatedAt: new Date().toISOString(),
            }
            : template
        )
      );
      toast(`Template state changed to ${nextState}.`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to update template state.',
        { variant: 'error' }
      );
    }
  };

  const handleDeleteTemplate = async (templateId: string): Promise<void> => {
    try {
      const nextTemplates = promptExploderSettings.learning.templates.filter(
        (template) => template.id !== templateId
      );
      const nextSettings = {
        ...promptExploderSettings,
        learning: {
          ...promptExploderSettings.learning,
          templates: nextTemplates,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setSessionLearnedTemplates((previous) =>
        previous.filter((template) => template.id !== templateId)
      );
      toast('Template removed.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to remove template.',
        { variant: 'error' }
      );
    }
  };

  const handleReassemblePrompt = (): void => {
    if (!documentState) {
      toast('Explode the prompt before reassembling.', { variant: 'info' });
      return;
    }
    const reassembled = reassemblePromptSegments(documentState.segments);
    setDocumentState((current: PromptExploderDocument | null) =>
      current
        ? {
          ...current,
          reassembledPrompt: reassembled,
        }
        : current
    );
    toast('Reassembled output refreshed.', { variant: 'success' });
  };

  const handleApplyToImageStudio = (): void => {
    if (!documentState) {
      toast('Explode the prompt before applying it.', { variant: 'info' });
      return;
    }

    const reassembled = reassemblePromptSegments(documentState.segments);
    if (returnTarget === 'case-resolver') {
      savePromptExploderApplyPromptForCaseResolver(
        reassembled,
        incomingCaseResolverContext,
        caseResolverPartyBundle,
        caseResolverMetadata
      );
      toast('Restructured text sent to Case Resolver.', { variant: 'success' });
    } else {
      savePromptExploderApplyPrompt(reassembled);
      toast('Reassembled prompt sent to Image Studio.', { variant: 'success' });
    }
    router.push(returnTo);
  };

  const handleReloadFromStudio = (): void => {
    const draftPayload = consumePromptExploderDraftPayload('prompt-exploder');
    if (!draftPayload) {
      toast(`No draft prompt was received from ${sourceContextLabel}.`, { variant: 'info' });
      return;
    }
    const sourceLabel = draftPayload.source === 'case-resolver' ? 'Case Resolver' : 'Image Studio';
    setPromptText(draftPayload.prompt);
    if (draftPayload.source === 'case-resolver' || draftPayload.source === 'image-studio') {
      setIncomingBridgeSource(draftPayload.source);
      if (draftPayload.source === 'case-resolver') {
        setLearningDraft((previous) => ({
          ...previous,
          runtimeValidationRuleStack:
            promptExploderValidationStackFromBridgeSource(
              draftPayload.source,
              validatorPatternLists
            ),
        }));
      }
    } else {
      setIncomingBridgeSource(null);
    }
    setIncomingCaseResolverContext(draftPayload.caseResolverContext ?? null);
    toast(`Loaded latest prompt draft from ${sourceLabel}.`, { variant: 'success' });
  };

  const handleAddManualBinding = (): void => {
    if (!documentState) {
      toast('Explode a prompt before adding bindings.', { variant: 'info' });
      return;
    }

    const builtBinding = buildManualBindingFromDraft({

      segments: documentState.segments,

      draft: bindingDraft,

      createManualBindingId: promptExploderCreateManualBindingId,

      formatSubsectionLabel,

    });

    
    if (!builtBinding.ok) {
      toast(builtBinding.message, { variant: builtBinding.variant });
      return;
    }

    syncManualBindings([...manualBindings, builtBinding.binding]);
    setBindingDraft((previous) => ({
      ...previous,
      sourceLabel: '',
      targetLabel: '',
    }));
    toast('Manual binding added.', { variant: 'success' });
  };

  const handleRemoveManualBinding = (bindingId: string): void => {
    const nextManual = manualBindings.filter((binding) => binding.id !== bindingId);
    syncManualBindings(nextManual);
  };

  const handleApproveSelectedSegmentPattern = async (): Promise<void> => {
    if (!selectedSegment) {
      toast('Select a segment before approving a pattern.', { variant: 'info' });
      return;
    }
    if (!approvalDraft.rulePattern.trim()) {
      toast('Rule pattern cannot be empty.', { variant: 'error' });
      return;
    }
    try {
      void new RegExp(approvalDraft.rulePattern, 'mi');
    } catch (error) {
      toast(
        error instanceof Error
          ? `Invalid regex pattern: ${error.message}`
          : 'Invalid regex pattern.',
        { variant: 'error' }
      );
      return;
    }

    try {
      const now = new Date().toISOString();
      const segmentSampleText = buildSegmentSampleText(selectedSegment);
      const segmentLearningSource = `${selectedSegment.title} ${segmentSampleText}`.trim();
      const templateUpsert = upsertLearnedTemplate({
        templates: effectiveLearnedTemplates,
        segmentType: approvalDraft.ruleSegmentType,
        title: selectedSegment.title,
        sourceText: segmentLearningSource,
        sampleText: segmentSampleText,
        similarityThreshold: templateMergeThreshold,
        minApprovalsForMatching: learningDraft.minApprovalsForMatching,
        autoActivateLearnedTemplates: learningDraft.autoActivateLearnedTemplates,
        mergeMode: approvalDraft.templateMergeMode,
        targetTemplateId: approvalDraft.templateTargetId,
        now,
        createTemplateId: ({ segmentType, existingTemplateIds }) => {
          let nextId = `template_${segmentType}_${Date.now().toString(36)}`;
          while (existingTemplateIds.has(nextId)) {
            nextId = `${nextId}_x`;
          }
          return nextId;
        },
      });
      if (!templateUpsert.ok) {
        toast(templateUpsert.errorMessage, { variant: 'error' });
        return;
      }
      const { nextTemplate, nextTemplates, mergeMessage } = templateUpsert;

      const learnedRuleId = `segment.learned.${approvalDraft.ruleSegmentType}.${nextTemplate.id}`;
      const learnedRuleDraft = buildManualLearnedRegexRuleDraft({
        id: learnedRuleId,
        segmentTitle: selectedSegment.title,
        segmentType: approvalDraft.ruleSegmentType,
        sequence: 1000 + nextTemplates.length,
        ruleTitle: approvalDraft.ruleTitle,
        rulePattern: approvalDraft.rulePattern,
        priority: approvalDraft.rulePriority,
        confidenceBoost: approvalDraft.ruleConfidenceBoost,
        treatAsHeading: approvalDraft.ruleTreatAsHeading,
      });

      const basePromptSettings = promptSettings.promptValidation
        ? promptSettings
        : defaultPromptEngineSettings;
      const learnedRules = basePromptSettings.promptValidation.learnedRules ?? [];
      const learnedRuleUpsert = upsertRegexLearnedRule({
        rules: learnedRules,
        incomingRule: learnedRuleDraft,
      });
      const learnedRule = learnedRuleUpsert.nextRule;
      const nextLearnedRules = learnedRuleUpsert.nextRules;

      const nextPromptSettings = {
        ...basePromptSettings,
        promptValidation: {
          ...basePromptSettings.promptValidation,
          learnedRules: nextLearnedRules,
        },
      };

      const nextExploderSettings = {
        ...promptExploderSettings,
        learning: {
          ...promptExploderSettings.learning,
          templates: nextTemplates,
        },
      };
      const runtimeTemplatesAfterApproval =
        nextExploderSettings.learning.enabled
          ? filterTemplatesForRuntime(nextTemplates, {
            minApprovalsForMatching:
              nextExploderSettings.learning.minApprovalsForMatching,
            maxTemplates: nextExploderSettings.learning.maxTemplates,
          })
          : [];

      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextPromptSettings),
      });
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextExploderSettings),
      });

      setSessionLearnedRules((previous) => [
        ...previous.filter((rule) => rule.id !== learnedRule.id),
        learnedRule,
      ]);
      setSessionLearnedTemplates((previous) => [
        ...previous.filter((template) => template.id !== nextTemplate.id),
        nextTemplate,
      ]);

      const sourcePrompt = promptText.trim() || documentState?.sourcePrompt || '';
      if (sourcePrompt) {
        const nextRuntimeRules = buildRuntimeRulesForReexplode({
          runtimeValidationRules,
          runtimeRuleProfile: learningDraft.runtimeRuleProfile,
          appliedRules: [learnedRule],
        });
        const refreshed = reexplodePromptWithRuntime({
          prompt: sourcePrompt,
          validationRules: nextRuntimeRules,
          learnedTemplates: runtimeTemplatesAfterApproval,
          similarityThreshold: nextExploderSettings.learning.similarityThreshold,
          validationScope: activeValidationScope,
        });
        setManualBindings([]);
        setDocumentState(refreshed);
        setSelectedSegmentId(
          resolveSegmentIdAfterReexplode({
            document: refreshed,
            strategy: {
              kind: 'match_title',
              title: selectedSegment.title,
            },
          })
        );
      }

      toast(`Pattern approved. Prompt Exploder learned and re-applied it (${mergeMessage}).`, {
        variant: 'success',
      });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to approve and learn this segment pattern.',
        { variant: 'error' }
      );
    }
  };

  const handleAddBenchmarkSuggestionRules = async (
    suggestions: PromptExploderBenchmarkSuggestion[]
  ): Promise<void> => {
    const preparedSuggestions = prepareBenchmarkSuggestionsForApply(suggestions);
    const uniqueSuggestions = preparedSuggestions.uniqueSuggestions;
    if (uniqueSuggestions.length === 0) {
      toast('No benchmark suggestions selected.', { variant: 'info' });
      return;
    }

    const invalidSuggestions = [...preparedSuggestions.invalidSegmentTitles];
    const validSuggestions = preparedSuggestions.validSuggestions;

    if (validSuggestions.length === 0) {
      toast('No valid benchmark suggestions to add.', { variant: 'error' });
      return;
    }

    try {
      const basePromptSettings = promptSettings.promptValidation
        ? promptSettings
        : defaultPromptEngineSettings;
      const shouldUpsertTemplates = learningDraft.benchmarkSuggestionUpsertTemplates;
      const benchmarkApply = applyBenchmarkSuggestions({
        suggestions: validSuggestions,
        initialRules: [
          ...(basePromptSettings.promptValidation.learnedRules ?? []),
          ...sessionLearnedRules,
        ],
        initialTemplates: effectiveLearnedTemplates,
        shouldUpsertTemplates,
        templateMergeThreshold,
        minApprovalsForMatching: learningDraft.minApprovalsForMatching,
        autoActivateLearnedTemplates: learningDraft.autoActivateLearnedTemplates,
      });
      invalidSuggestions.push(...benchmarkApply.invalidSegmentTitles);

      const nextLearnedRules = benchmarkApply.nextLearnedRules;
      const nextTemplates = benchmarkApply.nextTemplates;
      const nextPromptSettings = {
        ...basePromptSettings,
        promptValidation: {
          ...basePromptSettings.promptValidation,
          learnedRules: nextLearnedRules,
        },
      };
      const nextExploderSettings = {
        ...promptExploderSettings,
        learning: {
          ...promptExploderSettings.learning,
          templates: nextTemplates,
        },
      };

      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextPromptSettings),
      });
      if (shouldUpsertTemplates) {
        await updateSetting.mutateAsync({
          key: PROMPT_EXPLODER_SETTINGS_KEY,
          value: serializeSetting(nextExploderSettings),
        });
      }

      setSessionLearnedRules((previous) => {
        const byId = new Map(previous.map((rule) => [rule.id, rule]));
        benchmarkApply.appliedRules.forEach((rule) => {
          byId.set(rule.id, rule);
        });
        return [...byId.values()];
      });
      if (shouldUpsertTemplates) {
        setSessionLearnedTemplates((previous) => {
          const byId = new Map(previous.map((template) => [template.id, template]));
          nextTemplates.forEach((template) => {
            if (
              !benchmarkApply.touchedTemplateIds.includes(template.id) &&
              !byId.has(template.id)
            ) {
              return;
            }
            byId.set(template.id, template);
          });
          return [...byId.values()];
        });
      }
      setDismissedBenchmarkSuggestionIds((previous) => [
        ...new Set([...previous, ...validSuggestions.map((suggestion) => suggestion.id)]),
      ]);

      const sourcePrompt = promptText.trim() || documentState?.sourcePrompt || '';
      if (sourcePrompt) {
        const nextRuntimeRules = buildRuntimeRulesForReexplode({
          runtimeValidationRules,
          runtimeRuleProfile: learningDraft.runtimeRuleProfile,
          appliedRules: benchmarkApply.appliedRules,
        });
        const nextRuntimeTemplates = buildRuntimeTemplatesForReexplode({
          useUpdatedTemplates: shouldUpsertTemplates,
          runtimeLearnedTemplates,
          nextTemplates,
          learningEnabled: nextExploderSettings.learning.enabled,
          minApprovalsForMatching:
            nextExploderSettings.learning.minApprovalsForMatching,
          maxTemplates: nextExploderSettings.learning.maxTemplates,
        });
        const refreshed = reexplodePromptWithRuntime({
          prompt: sourcePrompt,
          validationRules: nextRuntimeRules,
          learnedTemplates: nextRuntimeTemplates,
          similarityThreshold: nextExploderSettings.learning.similarityThreshold,
          validationScope: activeValidationScope,
        });
        setManualBindings([]);
        setDocumentState(refreshed);
        setSelectedSegmentId((previous) => {
          return resolveSegmentIdAfterReexplode({
            document: refreshed,
            strategy: { kind: 'preserve_id', previousId: previous ?? null },
          });
        });
      }

      const summary = `Benchmark suggestions applied: added ${benchmarkApply.addedCount}, updated ${benchmarkApply.updatedCount}.`;
      const templateSummary = shouldUpsertTemplates
        ? `learned templates touched ${benchmarkApply.touchedTemplateIds.length}.`
        : 'learned-template upsert is disabled.';
      if (invalidSuggestions.length > 0) {
        toast(`${summary} ${templateSummary} Skipped invalid ${invalidSuggestions.length}.`, {
          variant: 'warning',
        });
      } else {
        toast(`${summary} ${templateSummary}`, { variant: 'success' });
      }
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to add benchmark suggestion rule(s).',
        { variant: 'error' }
      );
    }
  };

  const handleAddBenchmarkSuggestionRule = async (
    suggestion: PromptExploderBenchmarkSuggestion
  ): Promise<void> => {
    await handleAddBenchmarkSuggestionRules([suggestion]);
  };

  const handleDismissBenchmarkSuggestion = (suggestionId: string): void => {
    setDismissedBenchmarkSuggestionIds((previous) =>
      previous.includes(suggestionId) ? previous : [...previous, suggestionId]
    );
  };

  const handleDismissAllVisibleBenchmarkSuggestions = (): void => {
    if (visibleBenchmarkSuggestions.length === 0) return;
    setDismissedBenchmarkSuggestionIds((previous) => [
      ...new Set([
        ...previous,
        ...visibleBenchmarkSuggestions.map((suggestion) => suggestion.id),
      ]),
    ]);
  };

  const handleResetDismissedBenchmarkSuggestions = (): void => {
    setDismissedBenchmarkSuggestionIds([]);
  };

  const describeBindingEndpoint = (
    segmentId: string,
    subsectionId: string | null | undefined
  ): string => {
    const segment = segmentById.get(segmentId);
    if (!segment) return 'Unknown segment';
    if (!subsectionId) return segment.title;
    const subsection = segment.subsections.find((candidate) => candidate.id === subsectionId);
    if (!subsection) return segment.title;
    return `${segment.title} · ${formatSubsectionLabel(subsection)}`;
  };
  const applyOutputLabel =
    returnTarget === 'case-resolver' ? 'Apply to Case Resolver' : 'Apply to Image Studio';

  return (
    <div className='w-full space-y-5 px-4 py-6 xl:px-6 2xl:px-8'>
      <SectionHeader
        title='Prompt Exploder'
        description={sourceContextDescription}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              size='xs'
              variant='outline'
              onClick={handleReloadFromStudio}
            >
              <RefreshCcw className='mr-2 size-4' />
              Reload Incoming Draft
            </Button>
            <Button
              size='xs'
              variant='outline'
              onClick={() => {
                router.push('/admin/prompt-exploder/projects');
              }}
            >
              Projects
            </Button>
            <Button
              size='xs'
              variant='outline'
              onClick={() => {
                router.push('/admin/prompt-exploder/settings');
              }}
            >
              <Settings2 className='mr-2 size-4' />
              Settings
            </Button>
            <Button
              size='xs'
              variant='outline'
              onClick={() => {
                router.push(returnTo);
              }}
            >
              {returnTarget === 'case-resolver' ? 'Back to Case Resolver' : 'Back to Image Studio'}
            </Button>
          </div>
        }
      />

      <FormSection
        variant='subtle'
        className='p-4'
        actions={
          <div className='text-xs text-gray-400'>
            Active rules: <span className='text-gray-200'>{runtimeValidationRules.length}</span> ·
            learned templates:{' '}
            <span className='text-gray-200'>{effectiveLearnedTemplates.length}</span>
            {' '}· runtime templates:{' '}
            <span className='text-gray-200'>{runtimeLearnedTemplates.length}</span>
            {' '}· profile:{' '}
            <span className='text-gray-200'>{learningDraft.runtimeRuleProfile}</span>
            {' '}· stack:{' '}
            <span className='text-gray-200'>{activeValidationStackLabel}</span>
            {' '}· merge:{' '}
            <span className='text-gray-200'>{templateMergeThreshold.toFixed(2)}</span>
            {' '}· bench template upsert:{' '}
            <span className='text-gray-200'>
              {learningDraft.benchmarkSuggestionUpsertTemplates ? 'on' : 'off'}
            </span>
            {' '}· benchmark:{' '}
            <span className='text-gray-200'>{benchmarkSuiteDraft}</span>
            {' '}· low conf:{' '}
            <span className='text-gray-200'>
              {promptExploderClampNumber(benchmarkLowConfidenceThresholdDraft, 0.3, 0.9).toFixed(2)}
            </span>
            {' '}· suggestion cap:{' '}
            <span className='text-gray-200'>
              {promptExploderClampNumber(Math.floor(benchmarkSuggestionLimitDraft), 1, 20)}
            </span>
          </div>
        }
      >
        <div className='mt-3 grid gap-2 md:grid-cols-9'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Validation Pattern Stack</Label>
            <SelectSimple
              size='sm'
              value={learningDraft.runtimeValidationRuleStack}
              onValueChange={(value: string) => {
                setLearningDraft((previous) => ({
                  ...previous,
                  runtimeValidationRuleStack: value,
                }));
              }}
              options={validationPatternStackOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Runtime Rule Profile</Label>
            <SelectSimple
              size='sm'
              value={learningDraft.runtimeRuleProfile}
              onValueChange={(value: string) => {
                setLearningDraft((previous) => ({
                  ...previous,
                  runtimeRuleProfile: value as 'all' | 'pattern_pack' | 'learned_only',
                }));
              }}
              options={[
                { value: 'all', label: 'All Rules' },
                { value: 'pattern_pack', label: 'Pattern Pack Only' },
                { value: 'learned_only', label: 'Learned Rules Only' },
              ]}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Learning</Label>
            <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
              <StatusToggle
                enabled={learningDraft.enabled}
                onToggle={() => {
                  setLearningDraft((previous) => ({
                    ...previous,
                    enabled: !previous.enabled,
                  }));
                }}
              />
            </div>
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Similarity Threshold</Label>
            <Input
              type='number'
              min={0.3}
              max={0.95}
              step={0.01}
              value={learningDraft.similarityThreshold.toFixed(2)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setLearningDraft((previous) => ({
                  ...previous,
                  similarityThreshold: promptExploderClampNumber(value, 0.3, 0.95),
                }));
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Template Merge Threshold</Label>
            <Input
              type='number'
              min={0.3}
              max={0.95}
              step={0.01}
              value={learningDraft.templateMergeThreshold.toFixed(2)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setLearningDraft((previous) => ({
                  ...previous,
                  templateMergeThreshold: promptExploderClampNumber(value, 0.3, 0.95),
                }));
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Min Approvals For Match</Label>
            <Input
              type='number'
              min={1}
              max={20}
              step={1}
              value={String(learningDraft.minApprovalsForMatching)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setLearningDraft((previous) => ({
                  ...previous,
                  minApprovalsForMatching: promptExploderClampNumber(Math.floor(value), 1, 20),
                }));
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Runtime Template Cap</Label>
            <Input
              type='number'
              min={50}
              max={5000}
              step={10}
              value={String(learningDraft.maxTemplates)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setLearningDraft((previous) => ({
                  ...previous,
                  maxTemplates: promptExploderClampNumber(Math.floor(value), 50, 5000),
                }));
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Auto Activate Learned</Label>
            <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
              <StatusToggle
                enabled={learningDraft.autoActivateLearnedTemplates}
                onToggle={() => {
                  setLearningDraft((previous) => ({
                    ...previous,
                    autoActivateLearnedTemplates: !previous.autoActivateLearnedTemplates,
                  }));
                }}
              />
            </div>
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Benchmark Template Upsert</Label>
            <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
              <StatusToggle
                enabled={learningDraft.benchmarkSuggestionUpsertTemplates}
                onToggle={() => {
                  setLearningDraft((previous) => ({
                    ...previous,
                    benchmarkSuggestionUpsertTemplates:
                      !previous.benchmarkSuggestionUpsertTemplates,
                  }));
                }}
              />
            </div>
          </div>
        </div>
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleSaveLearningSettings();
            }}
            disabled={updateSetting.isPending}
          >
            Save Learning Settings
          </Button>
          <div className='text-xs text-gray-500'>
            Current runtime: stack {activeValidationStackLabel}, similarity {learningDraft.similarityThreshold.toFixed(2)}, merge {learningDraft.templateMergeThreshold.toFixed(2)}, min approvals {learningDraft.minApprovalsForMatching}, cap {learningDraft.maxTemplates}, auto-activate {learningDraft.autoActivateLearnedTemplates ? 'on' : 'off'}, benchmark template upsert {learningDraft.benchmarkSuggestionUpsertTemplates ? 'on' : 'off'}.
            {' '}Benchmark suite {benchmarkSuiteDraft}
            {benchmarkSuiteDraft === 'custom' && parsedCustomBenchmarkCases.ok
              ? ` (${parsedCustomBenchmarkCases.cases.length} custom case(s))`
              : ''}
          </div>
        </div>
        <div className='mt-4 rounded border border-border/60 bg-card/20 p-3'>
          <div className='mb-2 text-[11px] uppercase tracking-wide text-gray-400'>
            Pattern Snapshot Governance
          </div>
          <div className='grid gap-2 md:grid-cols-4'>
            <Input
              className='md:col-span-2'
              value={snapshotDraftName}
              onChange={(event) => setSnapshotDraftName(event.target.value)}
              placeholder='Snapshot name (optional)'
            />
            <SelectSimple
              size='sm'
              value={selectedSnapshotId}
              onValueChange={setSelectedSnapshotId}
              options={
                availableSnapshots.length > 0
                  ? availableSnapshots.map((snapshot) => ({
                    value: snapshot.id,
                    label: `${snapshot.name} (${snapshot.ruleCount})`,
                  }))
                  : [{ value: '', label: 'No snapshots' }]
              }
            />
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  void handleCapturePatternSnapshot();
                }}
                disabled={updateSetting.isPending}
              >
                Capture
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  void handleRestorePatternSnapshot();
                }}
                disabled={updateSetting.isPending || !selectedSnapshot}
              >
                Restore
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  void handleDeletePatternSnapshot();
                }}
                disabled={updateSetting.isPending || !selectedSnapshot}
              >
                Delete
              </Button>
            </div>
          </div>
          {selectedSnapshot ? (
            <div className='mt-2 text-xs text-gray-500'>
              Selected snapshot: {selectedSnapshot.name} · created {selectedSnapshot.createdAt} · rules {selectedSnapshot.ruleCount}
            </div>
          ) : (
            <div className='mt-2 text-xs text-gray-500'>
              No snapshot selected.
            </div>
          )}
        </div>
        <div className='mt-4 rounded border border-border/60 bg-card/20 p-3'>
          <div className='mb-2 text-[11px] uppercase tracking-wide text-gray-400'>
            Learned Template Lifecycle
          </div>
          {effectiveLearnedTemplates.length === 0 ? (
            <div className='text-xs text-gray-500'>No learned templates yet.</div>
          ) : (
            <div className='max-h-[220px] space-y-2 overflow-auto'>
              {effectiveLearnedTemplates.slice(0, 20).map((template) => (
                <div key={template.id} className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='truncate text-xs text-gray-200'>
                      {template.title}
                    </div>
                    <div className='text-[10px] text-gray-500'>
                      {template.segmentType} · approvals {template.approvals}
                    </div>
                  </div>
                  <div className='mt-1 flex items-center justify-between gap-2'>
                    <SelectSimple
                      size='sm'
                      value={template.state}
                      onValueChange={(value: string) => {
                        void handleTemplateStateChange(
                          template.id,
                          value as PromptExploderLearnedTemplate['state']
                        );
                      }}
                      options={[
                        { value: 'draft', label: 'Draft' },
                        { value: 'candidate', label: 'Candidate' },
                        { value: 'active', label: 'Active' },
                        { value: 'disabled', label: 'Disabled' },
                      ]}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        void handleDeleteTemplate(template.id);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      <FormSection
        title='Parser Tuning'
        description='Quick-edit boundary and subsection parser rules directly from Prompt Exploder (stored as Validation Patterns).'
        variant='subtle'
        className='p-4'
        actions={(
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              setIsParserTuningOpen((previous) => !previous);
            }}
          >
            {isParserTuningOpen ? 'Collapse' : 'Expand'}
          </Button>
        )}
      >
        {isParserTuningOpen ? (
          <PromptExploderParserTuningProvider
            value={{
              drafts: parserTuningDrafts,
              onPatchDraft: patchParserTuningDraft,
              onSave: () => {
                void handleSaveParserTuningRules();
              },
              onResetToPackDefaults: handleResetParserTuningDrafts,
              onOpenValidationPatterns: () => {
                const activeList = validatorPatternLists.find(
                  (list: ValidatorPatternList): boolean =>
                    list.id === learningDraft.runtimeValidationRuleStack
                );
                if (activeList) {
                  router.push(`/admin/validator?list=${encodeURIComponent(activeList.id)}`);
                  return;
                }
                router.push(`/admin/validator?scope=${activeValidatorScope}`);
              },
              isBusy: updateSetting.isPending,
            }}
          >
            <PromptExploderParserTuningPanel />
          </PromptExploderParserTuningProvider>
        ) : (
          <div className='text-xs text-gray-500'>Parser tuning is collapsed.</div>
        )}
      </FormSection>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] xl:items-start'>
        <div className='min-w-0 space-y-4'>
          <FormSection
            title='Source Prompt'
            description='Paste a prompt and explode it into structured segments.'
            variant='subtle'
            className='p-4'
            actions={
              <div className='flex items-center gap-2'>
                <Button type='button' onClick={handleExplode}>
                  Explode Prompt
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleApplyToImageStudio}
                  disabled={!documentState}
                >
                  {applyOutputLabel}
                </Button>
              </div>
            }
          >
            <div className='mt-3 space-y-2'>
              <Textarea
                className='min-h-[280px] font-mono text-[12px]'
                value={promptText}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setPromptText(event.target.value);
                }}
                placeholder='Paste prompt text...'
              />
            </div>
          </FormSection>

          <FormSection
            title='Explosion Metrics'
            description='Observability metrics for current segmentation quality.'
            variant='subtle'
            className='p-4'
          >
            {!explosionMetrics ? (
              <div className='text-xs text-gray-500'>Run Prompt Exploder to generate metrics.</div>
            ) : (
              <div className='space-y-2 text-xs text-gray-300'>
                <div>
                  Segments: {explosionMetrics.total} · avg confidence{' '}
                  {(explosionMetrics.avgConfidence * 100).toFixed(1)}% · low confidence (
                  {'<'}{explosionMetrics.lowConfidenceThreshold.toFixed(2)}):{' '}
                  {explosionMetrics.lowConfidenceCount}
                </div>
                <div>
                  Typed coverage: {(explosionMetrics.typedCoverage * 100).toFixed(1)}%
                </div>
                <div className='rounded border border-border/50 bg-card/20 p-2'>
                  {Object.entries(explosionMetrics.typeCounts)
                    .sort((left, right) => right[1] - left[1])
                    .map(([type, count]) => (
                      <div key={type}>
                        {type}: {count}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </FormSection>

          <FormSection
            title='Benchmark Report'
            description='Per-case precision/recall benchmark using current runtime profile and learning settings.'
            variant='subtle'
            className='p-4'
            actions={
              <Button
                type='button'
                variant='outline'
                onClick={handleRunBenchmark}
              >
                Run Benchmark
              </Button>
            }
          >
            <div className='space-y-3'>
              <div className='grid gap-2 md:grid-cols-5'>
                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Benchmark Suite</Label>
                  <SelectSimple
                    size='sm'
                    value={benchmarkSuiteDraft}
                    onValueChange={(value: string) => {
                      setBenchmarkSuiteDraft(value as PromptExploderBenchmarkSuite);
                    }}
                    options={[
                      {
                        value: 'default',
                        label: `Default (${DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES.length} cases)`,
                      },
                      {
                        value: 'extended',
                        label: `Extended (${EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES.length} cases)`,
                      },
                      {
                        value: 'custom',
                        label: 'Custom (JSON)',
                      },
                    ]}
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Low-Confidence Threshold</Label>
                  <Input
                    type='number'
                    min={0.3}
                    max={0.9}
                    step={0.01}
                    value={promptExploderClampNumber(benchmarkLowConfidenceThresholdDraft, 0.3, 0.9).toFixed(2)}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (!Number.isFinite(value)) return;
                      setBenchmarkLowConfidenceThresholdDraft(promptExploderClampNumber(value, 0.3, 0.9));
                    }}
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Suggestion Limit / Case</Label>
                  <Input
                    type='number'
                    min={1}
                    max={20}
                    step={1}
                    value={String(
                      promptExploderClampNumber(Math.floor(benchmarkSuggestionLimitDraft), 1, 20)
                    )}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (!Number.isFinite(value)) return;
                      setBenchmarkSuggestionLimitDraft(
                        promptExploderClampNumber(Math.floor(value), 1, 20)
                      );
                    }}
                  />
                </div>
                <div className='md:col-span-2 rounded border border-border/50 bg-card/20 p-2 text-[11px] text-gray-500'>
                  Suite controls benchmark depth only. Runtime rules/templates still follow the
                  selected Prompt Exploder runtime profile.
                </div>
              </div>
              {benchmarkSuiteDraft === 'custom' ? (
                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Custom Benchmark Cases JSON</Label>
                  <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]'>
                    <Input
                      value={customCaseDraftId}
                      onChange={(event) => setCustomCaseDraftId(event.target.value)}
                      placeholder='Custom case id (optional override)'
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={handleAddCurrentPromptAsCustomBenchmarkCase}
                    >
                      Add Current Prompt
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        handleLoadCustomBenchmarkTemplate('default');
                      }}
                    >
                      Use Default
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        handleLoadCustomBenchmarkTemplate('extended');
                      }}
                    >
                      Use Extended
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        handleAppendBenchmarkTemplateToCustom('extended');
                      }}
                    >
                      Append Extended
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={handleClearCustomBenchmarkCases}
                    >
                      Clear
                    </Button>
                  </div>
                  <Textarea
                    className='min-h-[180px] font-mono text-[11px]'
                    value={customBenchmarkCasesDraft}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                      setCustomBenchmarkCasesDraft(event.target.value);
                    }}
                    placeholder='[{"id":"case_1","prompt":"...","expectedTypes":["sequence"],"minSegments":1}]'
                  />
                  <div
                    className={`text-[10px] ${parsedCustomBenchmarkCases.ok ? 'text-gray-500' : 'text-red-300'}`}
                  >
                    {parsedCustomBenchmarkCases.ok
                      ? `Valid custom suite: ${parsedCustomBenchmarkCases.cases.length} case(s).`
                      : `Invalid custom suite: ${parsedCustomBenchmarkCases.error}`}
                  </div>
                </div>
              ) : null}
              {!benchmarkReport ? (
                <div className='text-xs text-gray-500'>Run benchmark to generate a report.</div>
              ) : (
                <div className='space-y-2 text-xs text-gray-300'>
                  <div>Generated: {benchmarkReport.generatedAt}</div>
                  <div>
                    Suite: {benchmarkReport.suite} · cases: {benchmarkReport.aggregate.caseCount} ·
                    expected-type recall{' '}
                    {(benchmarkReport.aggregate.expectedTypeRecall * 100).toFixed(1)}% · macro F1{' '}
                    {(benchmarkReport.aggregate.macroF1 * 100).toFixed(1)}% · min-segment pass{' '}
                    {(benchmarkReport.aggregate.minSegmentPassRate * 100).toFixed(1)}%
                  </div>
                  <div>
                    Low-confidence threshold: {benchmarkReport.config.lowConfidenceThreshold.toFixed(2)}{' '}
                    · suggestion cap/case: {benchmarkReport.config.suggestionLimit}
                  </div>
                  <div>
                    Low-confidence segments: {benchmarkReport.aggregate.totalLowConfidenceSegments} ·
                    suggestions: {benchmarkReport.aggregate.totalLowConfidenceSuggestions}
                  </div>
                  <div>
                    Gate (
                    {(PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET * 100).toFixed(0)}% recall):{' '}
                    <span
                      className={
                        benchmarkReport.aggregate.expectedTypeRecall >=
                        PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET
                          ? 'text-emerald-300'
                          : 'text-amber-300'
                      }
                    >
                      {benchmarkReport.aggregate.expectedTypeRecall >=
                      PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET
                        ? 'PASS'
                        : 'FAIL'}
                    </span>
                  </div>
                  <div className='max-h-[240px] space-y-2 overflow-auto rounded border border-border/50 bg-card/20 p-2'>
                    {benchmarkReport.cases.map((caseReport) => (
                      <div
                        key={caseReport.id}
                        className='rounded border border-border/50 bg-card/30 p-2'
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <span className='font-medium text-gray-200'>{caseReport.id}</span>
                          <span className='text-[10px] text-gray-500'>
                            segments {caseReport.segmentCount}/{caseReport.minSegments}
                          </span>
                        </div>
                        <div className='mt-1'>
                          precision {(caseReport.precision * 100).toFixed(1)}% · recall{' '}
                          {(caseReport.recall * 100).toFixed(1)}% · f1{' '}
                          {(caseReport.f1 * 100).toFixed(1)}%
                        </div>
                        <div className='mt-1 text-[10px] text-gray-500'>
                          missing: {caseReport.missingTypes.join(', ') || 'none'} · unexpected:{' '}
                          {caseReport.unexpectedTypes.join(', ') || 'none'} · low confidence:{' '}
                          {caseReport.lowConfidenceSegments}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className='rounded border border-border/50 bg-card/20 p-2'>
                    <div className='mb-2 flex items-center justify-between gap-2'>
                      <div className='text-[11px] uppercase tracking-wide text-gray-400'>
                        Suggested Patterns From Low-Confidence Segments
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            void handleAddBenchmarkSuggestionRules(
                              visibleBenchmarkSuggestions
                            );
                          }}
                          disabled={
                            updateSetting.isPending ||
                            visibleBenchmarkSuggestions.length === 0
                          }
                        >
                          Add All Visible
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={handleDismissAllVisibleBenchmarkSuggestions}
                          disabled={visibleBenchmarkSuggestions.length === 0}
                        >
                          Dismiss Visible
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={handleResetDismissedBenchmarkSuggestions}
                          disabled={dismissedBenchmarkSuggestionIds.length === 0}
                        >
                          Reset Dismissed
                        </Button>
                      </div>
                    </div>
                    <div className='mb-2 text-[10px] text-gray-500'>
                      visible {visibleBenchmarkSuggestions.length} / total{' '}
                      {benchmarkSuggestions.length} · dismissed{' '}
                      {dismissedBenchmarkSuggestionIds.length}
                    </div>
                    {visibleBenchmarkSuggestions.length === 0 ? (
                      <div className='text-[11px] text-gray-500'>
                        No visible suggestions in this run.
                      </div>
                    ) : (
                      <div className='max-h-[240px] space-y-2 overflow-auto'>
                        {visibleBenchmarkSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className='rounded border border-border/50 bg-card/30 p-2'
                          >
                            <div className='flex items-center justify-between gap-2'>
                              <div className='truncate text-[11px] text-gray-200'>
                                [{suggestion.caseId}] {suggestion.segmentTitle}
                              </div>
                              <div className='text-[10px] text-gray-500'>
                                {(suggestion.confidence * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div className='mt-1 text-[10px] text-gray-500'>
                              type: {suggestion.segmentType} · matched:{' '}
                              {suggestion.matchedPatternIds.join(', ') || 'none'}
                            </div>
                            <div className='mt-1 rounded border border-border/50 bg-card/20 px-2 py-1 font-mono text-[10px] text-gray-300'>
                              {suggestion.suggestedRulePattern}
                            </div>
                            <div className='mt-2 flex items-center justify-between gap-2'>
                              <div className='line-clamp-2 text-[10px] text-gray-500'>
                                {suggestion.sampleText || 'No sample text.'}
                              </div>
                              <div className='flex items-center gap-2'>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() => {
                                    void handleAddBenchmarkSuggestionRule(suggestion);
                                  }}
                                  disabled={updateSetting.isPending}
                                >
                                  Add Suggested Rule
                                </Button>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() => {
                                    handleDismissBenchmarkSuggestion(suggestion.id);
                                  }}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          <FormSection
            title='Segments'
            description='Edit segment content and ordering before reassembly.'
            variant='subtle'
            className='p-4'
          >
            {!documentState || documentState.segments.length === 0 ? (
              <EmptyState
                title='No segments yet'
                description='Run Prompt Exploder to generate editable segments.'
              />
            ) : (
              <div className='mt-3 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]'>
                <div className='max-h-[65vh] space-y-2 overflow-auto rounded border border-border/60 bg-card/20 p-2'>
                  {documentState.segments.map((segment) => {
                    const isDropTarget = segmentDropTargetId === segment.id;
                    const isDropBefore = isDropTarget && segmentDropPosition === 'before';
                    const isDropAfter = isDropTarget && segmentDropPosition === 'after';
                    return (
                      <div
                        key={segment.id}
                        role='button'
                        tabIndex={0}
                        className={`relative w-full rounded border px-2 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${selectedSegmentId === segment.id ? 'border-blue-400 bg-blue-500/10 text-gray-100' : 'border-border/50 bg-card/30 text-gray-300 hover:border-blue-300/50'} ${draggingSegmentId === segment.id ? 'opacity-60' : ''}`}
                        onClick={() => setSelectedSegmentId(segment.id)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return;
                          event.preventDefault();
                          setSelectedSegmentId(segment.id);
                        }}
                        onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                          handleSegmentDragOver(event, segment.id);
                        }}
                        onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                          handleSegmentDrop(event, segment.id);
                        }}
                      >
                        {isDropBefore ? (
                          <div className='pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-blue-400' />
                        ) : null}
                        {isDropAfter ? (
                          <div className='pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-blue-400' />
                        ) : null}
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex min-w-0 items-center gap-2'>
                            <button
                              type='button'
                              className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/50 text-gray-300 transition-colors hover:bg-card/70 hover:text-gray-100 active:cursor-grabbing'
                              aria-label='Drag to reorder segment'
                              draggable
                              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
                                event.stopPropagation();
                              }}
                              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                event.stopPropagation();
                              }}
                              onDragStart={(event: React.DragEvent<HTMLButtonElement>) => {
                                event.stopPropagation();
                                handleSegmentDragStart(event, segment.id);
                              }}
                              onDragEnd={() => {
                                handleSegmentDragEnd();
                              }}
                            >
                              <GripVertical className='size-3.5' />
                            </button>
                            <span className='truncate font-medium'>{resolveSegmentDisplayLabel(segment)}</span>
                          </div>
                          <span className='rounded border border-border/50 bg-card/50 px-1 py-0.5 text-[10px] uppercase'>
                            {segment.type.replaceAll('_', ' ')}
                          </span>
                        </div>
                        <div className='mt-1 flex items-center justify-between text-[10px] text-gray-500'>
                          <span>Confidence {(segment.confidence * 100).toFixed(0)}%</span>
                          <span>{segment.includeInOutput ? 'Included' : 'Omitted'}</span>
                        </div>
                        {(segment.matchedPatternLabels?.[0] ?? segment.matchedPatternIds?.[0]) ? (
                          <div className='mt-1 truncate text-[10px] text-gray-500'>
                            Pattern: {segment.matchedPatternLabels?.[0] ?? segment.matchedPatternIds?.[0]}
                          </div>
                        ) : null}
                        {segment.matchedSequenceLabels?.[0] ? (
                          <div className='truncate text-[10px] text-gray-500'>
                            Sequence: {segment.matchedSequenceLabels[0]}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className='max-h-[65vh] space-y-3 overflow-auto rounded border border-border/60 bg-card/20 p-3'>
                  {!selectedSegment ? (
                    <div className='text-sm text-gray-500'>Select a segment to edit.</div>
                  ) : (
                    <>
                      <div className='grid gap-3 md:grid-cols-2'>
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-gray-400'>Type</Label>
                          <SelectSimple
                            size='sm'
                            value={selectedSegment.type}
                            onValueChange={(value: string) => {
                              updateSegment(selectedSegment.id, (current) => ({
                                ...current,
                                type: value as PromptExploderSegment['type'],
                              }));
                            }}
                            options={[
                              { value: 'metadata', label: 'Metadata' },
                              { value: 'assigned_text', label: 'Assigned Text' },
                              { value: 'list', label: 'List' },
                              { value: 'parameter_block', label: 'Parameter Block' },
                              { value: 'referential_list', label: 'Referential List' },
                              { value: 'sequence', label: 'Sequence' },
                              { value: 'hierarchical_list', label: 'Hierarchical List' },
                              { value: 'conditional_list', label: 'Conditional List' },
                              { value: 'qa_matrix', label: 'QA Matrix' },
                            ]}
                          />
                        </div>
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-gray-400'>Include In Output</Label>
                          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
                            <StatusToggle
                              enabled={selectedSegment.includeInOutput}
                              onToggle={() => {
                                updateSegment(selectedSegment.id, (current) => ({
                                  ...current,
                                  includeInOutput: !current.includeInOutput,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className='space-y-1'>
                        <Label className='text-[11px] text-gray-400'>Title</Label>
                        <Input
                          value={selectedSegment.title}
                          onChange={(event) => {
                            updateSegment(selectedSegment.id, (current) => ({
                              ...current,
                              title: event.target.value,
                            }));
                          }}
                        />
                      </div>

                      {selectedSegment.type === 'metadata' ? (
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-gray-400'>Metadata Mode</Label>
                          <SelectSimple
                            size='sm'
                            value={selectedSegment.includeInOutput ? 'include' : 'omit'}
                            onValueChange={(value: string) => {
                              updateSegment(selectedSegment.id, (current) => ({
                                ...current,
                                includeInOutput: value === 'include',
                              }));
                            }}
                            options={[
                              { value: 'omit', label: 'Omit from reassembly' },
                              { value: 'include', label: 'Include in reassembly' },
                            ]}
                          />
                        </div>
                      ) : null}

                      {selectedSegment.type === 'parameter_block' ? (
                        <div className='space-y-3'>
                          <div className='space-y-2 rounded border border-border/50 bg-card/20 p-3'>
                            <div className='flex items-center justify-between'>
                              <Label className='text-[11px] uppercase tracking-wide text-gray-400'>
                                Parameters
                              </Label>
                              <span className='text-[10px] text-gray-500'>
                                {selectedParamEntriesState?.entries.length ?? 0} extracted
                              </span>
                            </div>

                            {selectedSegment.paramsObject && selectedParamEntriesState ? (
                              selectedParamEntriesState.entries.length > 0 ? (
                                <div className='max-h-[42vh] space-y-2 overflow-auto pr-1'>
                                  {selectedParamEntriesState.entries.map((entry) => (
                                    <div
                                      key={entry.path}
                                      className='space-y-2 rounded border border-border/50 bg-card/20 p-2'
                                    >
                                      <div className='flex items-center justify-between gap-2'>
                                        <div className='truncate font-mono text-[11px] text-gray-200'>
                                          {entry.path}
                                        </div>
                                        <div className='text-[10px] uppercase text-gray-500'>
                                          {promptExploderInferParamTypeLabel(entry)}
                                        </div>
                                      </div>

                                      <div className='grid gap-2 lg:grid-cols-[220px_minmax(0,1fr)]'>
                                        <div className='space-y-1'>
                                          <Label className='text-[10px] text-gray-500'>Selector</Label>
                                          <SelectSimple
                                            size='sm'
                                            value={entry.selector}
                                            onValueChange={(next: string) => {
                                              updateParameterSelector(selectedSegment.id, entry.path, next);
                                            }}
                                            options={entry.selectorOptions.map((control) => ({
                                              value: control,
                                              label:
                                                control === 'auto'
                                                  ? `Auto (${promptExploderParamUiControlLabel(
                                                    entry.recommendation.recommended
                                                  )})`
                                                  : promptExploderParamUiControlLabel(control),
                                            }))}
                                          />
                                        </div>

                                        <div className='space-y-1'>
                                          <Label className='text-[10px] text-gray-500'>Value</Label>

                                          {entry.recommendation.baseKind === 'boolean' &&
                                          typeof entry.value === 'boolean' &&
                                          entry.resolvedSelector !== 'json' ? (
                                              entry.resolvedSelector === 'buttons' ? (
                                                <div className='flex items-center gap-2'>
                                                  <Button
                                                    type='button'
                                                    variant={entry.value ? 'secondary' : 'outline'}
                                                    size='sm'
                                                    onClick={() => {
                                                      updateParameterValue(selectedSegment.id, entry.path, true);
                                                    }}
                                                  >
                                                  true
                                                  </Button>
                                                  <Button
                                                    type='button'
                                                    variant={!entry.value ? 'secondary' : 'outline'}
                                                    size='sm'
                                                    onClick={() => {
                                                      updateParameterValue(selectedSegment.id, entry.path, false);
                                                    }}
                                                  >
                                                  false
                                                  </Button>
                                                </div>
                                              ) : (
                                                <SelectSimple
                                                  size='sm'
                                                  value={entry.value ? 'true' : 'false'}
                                                  onValueChange={(next: string) => {
                                                    updateParameterValue(
                                                      selectedSegment.id,
                                                      entry.path,
                                                      next === 'true'
                                                    );
                                                  }}
                                                  options={[
                                                    { value: 'true', label: 'true' },
                                                    { value: 'false', label: 'false' },
                                                  ]}
                                                />
                                              )
                                            ) : null}

                                          {entry.recommendation.baseKind === 'enum' &&
                                          typeof entry.value === 'string' &&
                                          entry.spec?.enumOptions &&
                                          entry.resolvedSelector !== 'json' ? (
                                              entry.resolvedSelector === 'buttons' ? (
                                                <div className='flex flex-wrap gap-2'>
                                                  {entry.spec.enumOptions.map((option) => (
                                                    <Button
                                                      key={option}
                                                      type='button'
                                                      variant={
                                                        option === entry.value ? 'secondary' : 'outline'
                                                      }
                                                      size='sm'
                                                      onClick={() => {
                                                        updateParameterValue(
                                                          selectedSegment.id,
                                                          entry.path,
                                                          option
                                                        );
                                                      }}
                                                    >
                                                      {option}
                                                    </Button>
                                                  ))}
                                                </div>
                                              ) : entry.resolvedSelector === 'text' ? (
                                                <Input
                                                  value={entry.value}
                                                  onChange={(event) => {
                                                    updateParameterValue(
                                                      selectedSegment.id,
                                                      entry.path,
                                                      event.target.value
                                                    );
                                                  }}
                                                />
                                              ) : (
                                                <SelectSimple
                                                  size='sm'
                                                  value={entry.value}
                                                  onValueChange={(next: string) => {
                                                    updateParameterValue(
                                                      selectedSegment.id,
                                                      entry.path,
                                                      next
                                                    );
                                                  }}
                                                  options={entry.spec.enumOptions.map((option) => ({
                                                    value: option,
                                                    label: option,
                                                  }))}
                                                />
                                              )
                                            ) : null}

                                          {entry.recommendation.baseKind === 'number' &&
                                          promptExploderIsFiniteNumber(entry.value) &&
                                          entry.resolvedSelector !== 'json' ? (
                                              <div className='space-y-2'>
                                                {entry.resolvedSelector === 'slider' &&
                                              entry.recommendation.canSlider ? (
                                                    <input
                                                      type='range'
                                                      min={entry.spec?.min ?? 0}
                                                      max={entry.spec?.max ?? 1}
                                                      step={entry.spec?.step ?? 0.01}
                                                      value={entry.value}
                                                      onChange={(event) => {
                                                        const next = Number(event.target.value);
                                                        if (!Number.isFinite(next)) return;
                                                        updateParameterValue(
                                                          selectedSegment.id,
                                                          entry.path,
                                                          next
                                                        );
                                                      }}
                                                      className='w-full'
                                                    />
                                                  ) : null}
                                                <Input
                                                  type='number'
                                                  value={String(entry.value)}
                                                  min={entry.spec?.min}
                                                  max={entry.spec?.max}
                                                  step={entry.spec?.step}
                                                  onChange={(event) => {
                                                    const next = Number(event.target.value);
                                                    if (!Number.isFinite(next)) return;
                                                    updateParameterValue(
                                                      selectedSegment.id,
                                                      entry.path,
                                                      next
                                                    );
                                                  }}
                                                />
                                              </div>
                                            ) : null}

                                          {entry.recommendation.baseKind === 'rgb' &&
                                          isParamArrayTupleLength(entry.value, 3) &&
                                          entry.resolvedSelector !== 'json' ? (
                                              <div className='grid grid-cols-3 gap-2'>
                                                {['R', 'G', 'B'].map((label, index) => (
                                                  <div key={label} className='space-y-1'>
                                                    <div className='text-[10px] text-gray-500'>{label}</div>
                                                    <Input
                                                      type='number'
                                                      value={String((entry.value as unknown[])[index] ?? '')}
                                                      min={entry.spec?.min ?? 0}
                                                      max={entry.spec?.max ?? 255}
                                                      step={entry.spec?.step ?? 1}
                                                      onChange={(event) => {
                                                        const next = Number(event.target.value);
                                                        if (!Number.isFinite(next)) return;
                                                        const nextRgb = [...(entry.value as unknown[])];
                                                        nextRgb[index] = next;
                                                        updateParameterValue(
                                                          selectedSegment.id,
                                                          entry.path,
                                                          nextRgb
                                                        );
                                                      }}
                                                    />
                                                  </div>
                                                ))}
                                              </div>
                                            ) : null}

                                          {entry.recommendation.baseKind === 'tuple2' &&
                                          isParamArrayTupleLength(entry.value, 2) &&
                                          entry.resolvedSelector !== 'json' ? (
                                              <div className='grid grid-cols-2 gap-2'>
                                                {['X', 'Y'].map((label, index) => (
                                                  <div key={label} className='space-y-1'>
                                                    <div className='text-[10px] text-gray-500'>{label}</div>
                                                    <Input
                                                      type='number'
                                                      value={String((entry.value as unknown[])[index] ?? '')}
                                                      min={entry.spec?.min}
                                                      max={entry.spec?.max}
                                                      step={entry.spec?.step ?? 1}
                                                      onChange={(event) => {
                                                        const next = Number(event.target.value);
                                                        if (!Number.isFinite(next)) return;
                                                        const nextTuple = [...(entry.value as unknown[])];
                                                        nextTuple[index] = next;
                                                        updateParameterValue(
                                                          selectedSegment.id,
                                                          entry.path,
                                                          nextTuple
                                                        );
                                                      }}
                                                    />
                                                  </div>
                                                ))}
                                              </div>
                                            ) : null}

                                          {entry.recommendation.baseKind === 'string' &&
                                          typeof entry.value === 'string' &&
                                          entry.resolvedSelector !== 'json' ? (
                                              entry.resolvedSelector === 'textarea' ? (
                                                <Textarea
                                                  className='min-h-[86px] font-mono text-[11px]'
                                                  value={entry.value}
                                                  onChange={(event) => {
                                                    updateParameterValue(
                                                      selectedSegment.id,
                                                      entry.path,
                                                      event.target.value
                                                    );
                                                  }}
                                                />
                                              ) : (
                                                <Input
                                                  value={entry.value}
                                                  onChange={(event) => {
                                                    updateParameterValue(
                                                      selectedSegment.id,
                                                      entry.path,
                                                      event.target.value
                                                    );
                                                  }}
                                                />
                                              )
                                            ) : null}

                                          {entry.resolvedSelector === 'json' ||
                                          !(
                                            (entry.recommendation.baseKind === 'boolean' &&
                                              typeof entry.value === 'boolean') ||
                                            (entry.recommendation.baseKind === 'enum' &&
                                              typeof entry.value === 'string') ||
                                            (entry.recommendation.baseKind === 'number' &&
                                              promptExploderIsFiniteNumber(entry.value)) ||
                                            (entry.recommendation.baseKind === 'rgb' &&
                                              isParamArrayTupleLength(entry.value, 3)) ||
                                            (entry.recommendation.baseKind === 'tuple2' &&
                                              isParamArrayTupleLength(entry.value, 2)) ||
                                            (entry.recommendation.baseKind === 'string' &&
                                              typeof entry.value === 'string')
                                          ) ? (
                                              <Textarea
                                                className='min-h-[86px] font-mono text-[11px]'
                                                value={promptExploderSafeJsonStringify(entry.value)}
                                                onChange={(event) => {
                                                  updateParameterValue(
                                                    selectedSegment.id,
                                                    entry.path,
                                                    sanitizeParamJsonValue(event.target.value, entry.value)
                                                  );
                                                }}
                                              />
                                            ) : null}
                                        </div>
                                      </div>

                                      <div className='grid gap-2 md:grid-cols-2'>
                                        <div className='space-y-1'>
                                          <Label className='text-[10px] text-gray-500'>Comment</Label>
                                          <Input
                                            value={entry.comment}
                                            placeholder='Inline comment'
                                            onChange={(event) => {
                                              updateParameterComment(
                                                selectedSegment.id,
                                                entry.path,
                                                event.target.value
                                              );
                                            }}
                                          />
                                        </div>
                                        <div className='space-y-1'>
                                          <Label className='text-[10px] text-gray-500'>Description</Label>
                                          <Textarea
                                            className='min-h-[72px] text-[11px]'
                                            value={entry.description}
                                            placeholder='Description above this parameter'
                                            onChange={(event) => {
                                              updateParameterDescription(
                                                selectedSegment.id,
                                                entry.path,
                                                event.target.value
                                              );
                                            }}
                                          />
                                        </div>
                                      </div>

                                      {entry.selector === 'auto' && entry.recommendation.reason ? (
                                        <div className='text-[10px] text-gray-500'>
                                          Auto selector note: {entry.recommendation.reason}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className='text-xs text-gray-500'>
                                  No leaf parameters detected in the current params object.
                                </div>
                              )
                            ) : (
                              <div className='text-xs text-gray-500'>
                                {'No parseable `params = { ... }` object detected yet.'}
                              </div>
                            )}
                          </div>

                          <div className='space-y-2'>
                            <Label className='text-[11px] text-gray-400'>Parameters Text</Label>
                            <Textarea
                              className='min-h-[220px] font-mono text-[12px]'
                              value={selectedSegment.paramsText || selectedSegment.text}
                              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                                const nextText = event.target.value;
                                updateSegment(selectedSegment.id, (current) => {
                                  const extracted = extractParamsFromPrompt(nextText);
                                  if (!extracted.ok) {
                                    return {
                                      ...current,
                                      paramsText: nextText,
                                      text: nextText,
                                      raw: nextText,
                                      paramsObject: null,
                                      paramUiControls: {},
                                      paramComments: {},
                                      paramDescriptions: {},
                                    };
                                  }
                                  const nextParamState = buildPromptExploderParamEntries({
                                    paramsObject: extracted.params,
                                    paramsText: nextText,
                                    paramUiControls: current.paramUiControls ?? null,
                                    paramComments: current.paramComments ?? null,
                                    paramDescriptions: current.paramDescriptions ?? null,
                                  });
                                  return {
                                    ...current,
                                    paramsText: nextText,
                                    text: nextText,
                                    raw: nextText,
                                    paramsObject: extracted.params,
                                    paramUiControls: nextParamState.paramUiControls,
                                    paramComments: nextParamState.paramComments,
                                    paramDescriptions: nextParamState.paramDescriptions,
                                  };
                                });
                              }}
                            />
                          </div>
                        </div>
                      ) : null}

                      {['list', 'referential_list', 'conditional_list'].includes(
                        selectedSegment.type
                      ) ? (
                          <div className='space-y-2'>
                            <div className='flex items-center justify-between'>
                              <Label className='text-[11px] text-gray-400'>List Items</Label>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  updateSegment(selectedSegment.id, (current) => ({
                                    ...current,
                                    listItems: promptExploderAddBlankListItem(current.listItems),
                                  }));
                                }}
                              >
                                <Plus className='mr-2 size-3.5' />
                              Add Item
                              </Button>
                            </div>
                            {selectedSegment.listItems.length === 0 ? (
                              <div className='text-xs text-gray-500'>No list items detected.</div>
                            ) : null}
                            <div className='space-y-2'>
                              {selectedSegment.listItems.map((item, index) => (
                                <div
                                  key={item.id}
                                  className={`relative rounded border border-border/50 bg-card/20 p-2 ${draggingListItemIndex === index ? 'opacity-60' : ''}`}
                                  onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                                    handleListItemDragOver(event, index);
                                  }}
                                  onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                                    handleListItemDrop(event, selectedSegment.id, index);
                                  }}
                                >
                                  {listItemDropTargetIndex === index && listItemDropPosition === 'before' ? (
                                    <div className='pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-blue-400' />
                                  ) : null}
                                  {listItemDropTargetIndex === index && listItemDropPosition === 'after' ? (
                                    <div className='pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-blue-400' />
                                  ) : null}
                                  {(() => {
                                    const rgbLiteral = extractRgbLiteral(item.text);
                                    return (
                                      <div className='flex items-center gap-1'>
                                        <button
                                          type='button'
                                          className='inline-flex size-9 items-center justify-center rounded border border-border/60 bg-card/50 text-gray-300 transition-colors hover:bg-card/70 hover:text-gray-100 active:cursor-grabbing'
                                          aria-label='Drag to reorder list item'
                                          draggable
                                          onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
                                            event.stopPropagation();
                                          }}
                                          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                            event.stopPropagation();
                                          }}
                                          onDragStart={(event: React.DragEvent<HTMLButtonElement>) => {
                                            event.stopPropagation();
                                            handleListItemDragStart(event, index);
                                          }}
                                          onDragEnd={() => {
                                            handleListItemDragEnd();
                                          }}
                                        >
                                          <GripVertical className='size-3.5' />
                                        </button>
                                        <Input
                                          value={item.text}
                                          onChange={(event) => {
                                            updateTopLevelListItem(selectedSegment.id, index, (currentItem) => ({
                                              ...currentItem,
                                              text: event.target.value,
                                            }));
                                          }}
                                        />
                                        {rgbLiteral ? (
                                          <input
                                            type='color'
                                            className='h-9 w-10 cursor-pointer rounded border border-border/60 bg-transparent p-1'
                                            value={rgbToHex(rgbLiteral)}
                                            onChange={(event) => {
                                              const parsed = hexToRgb(event.target.value);
                                              if (!parsed) return;
                                              updateTopLevelListItem(selectedSegment.id, index, (currentItem) => ({
                                                ...currentItem,
                                                text: replaceRgbLiteral(currentItem.text, parsed),
                                              }));
                                            }}
                                            aria-label='RGB color picker'
                                          />
                                        ) : null}
                                      </div>
                                    );
                                  })()}
                                  {renderListItemLogicalEditor({
                                    item,
                                    onChange: (updater) => {
                                      updateTopLevelListItem(selectedSegment.id, index, updater);
                                    },
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                      {selectedSegment.type === 'hierarchical_list' ? (
                        <PromptExploderHierarchyTreeProvider
                          value={{
                            items: selectedSegment.listItems,
                            onChange: (nextItems) => {
                              updateSegment(selectedSegment.id, (current) => ({
                                ...current,
                                listItems: nextItems,
                              }));
                            },
                            renderLogicalEditor: ({ item, onChange }) =>
                              renderListItemLogicalEditor({
                                item,
                                onChange,
                              }),
                            emptyLabel: 'No hierarchy items detected.',
                          }}
                        >
                          <PromptExploderHierarchyTreeEditor />
                        </PromptExploderHierarchyTreeProvider>
                      ) : null}

                      {selectedSegment.type === 'sequence' || selectedSegment.type === 'qa_matrix' ? (
                        <div className='space-y-3'>
                          <div className='flex items-center justify-between'>
                            <div className='text-[11px] uppercase tracking-wide text-gray-400'>
                              {selectedSegment.type === 'qa_matrix' ? 'QA Subsections' : 'Sequence Subsections'}
                            </div>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                updateSegment(selectedSegment.id, (current) => ({
                                  ...current,
                                  subsections: [...current.subsections, promptExploderCreateSubsection()],
                                }));
                              }}
                            >
                              <Plus className='mr-2 size-3.5' />
                              Add Subsection
                            </Button>
                          </div>
                          {selectedSegment.subsections.length === 0 ? (
                            <div className='text-xs text-gray-500'>No subsections detected.</div>
                          ) : null}
                          {selectedSegment.subsections.map((subsection, subsectionIndex) => (
                            <div key={subsection.id} className='space-y-2 rounded border border-border/50 bg-card/20 p-2'>
                              <div className='flex items-center justify-between'>
                                <div className='text-[11px] text-gray-400'>
                                  Subsection {subsectionIndex + 1}
                                </div>
                                <div className='flex items-center gap-1'>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    disabled={subsectionIndex === 0}
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => ({
                                        ...current,
                                        subsections: moveByDelta(current.subsections, subsectionIndex, -1),
                                      }));
                                    }}
                                  >
                                    <ArrowUp className='size-3.5' />
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    disabled={subsectionIndex === selectedSegment.subsections.length - 1}
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => ({
                                        ...current,
                                        subsections: moveByDelta(current.subsections, subsectionIndex, 1),
                                      }));
                                    }}
                                  >
                                    <ArrowDown className='size-3.5' />
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => ({
                                        ...current,
                                        subsections: current.subsections.filter(
                                          (_, index) => index !== subsectionIndex
                                        ),
                                      }));
                                    }}
                                  >
                                    <Trash2 className='size-3.5' />
                                  </Button>
                                </div>
                              </div>
                              <div className='grid gap-2 md:grid-cols-2'>
                                <Input
                                  value={subsection.title}
                                  onChange={(event) => {
                                    updateSegment(selectedSegment.id, (current) => {
                                      const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                        candidateIndex === subsectionIndex
                                          ? {
                                            ...candidate,
                                            title: event.target.value,
                                          }
                                          : candidate
                                      );
                                      return {
                                        ...current,
                                        subsections: nextSubsections,
                                      };
                                    });
                                  }}
                                  placeholder='Subsection title'
                                />
                                <Input
                                  value={subsection.code ?? ''}
                                  onChange={(event) => {
                                    updateSegment(selectedSegment.id, (current) => {
                                      const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                        candidateIndex === subsectionIndex
                                          ? {
                                            ...candidate,
                                            code: event.target.value.trim().toUpperCase() || null,
                                          }
                                          : candidate
                                      );
                                      return {
                                        ...current,
                                        subsections: nextSubsections,
                                      };
                                    });
                                  }}
                                  placeholder='Reference code (e.g. RL4)'
                                />
                              </div>
                              <Input
                                value={subsection.condition ?? ''}
                                onChange={(event) => {
                                  updateSegment(selectedSegment.id, (current) => {
                                    const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                      candidateIndex === subsectionIndex
                                        ? {
                                          ...candidate,
                                          condition: event.target.value.trim() || null,
                                        }
                                        : candidate
                                    );
                                    return {
                                      ...current,
                                      subsections: nextSubsections,
                                    };
                                  });
                                }}
                                placeholder='Condition (optional)'
                              />
                              {(() => {
                                const parsedCondition = parseSubsectionConditionText(
                                  subsection.condition
                                );
                                const operatorValue = parsedCondition?.operator ?? 'none';
                                const paramPath = parsedCondition?.paramPath ?? '';
                                const comparatorValue =
                                  parsedCondition?.comparator ?? 'truthy';
                                const selectedParamEntry = paramPath
                                  ? (listParamEntryByPath.get(paramPath) ?? null)
                                  : null;
                                const needsValue =
                                  operatorValue !== 'none' &&
                                  paramPath.length > 0 &&
                                  comparatorValue !== 'truthy' &&
                                  comparatorValue !== 'falsy';
                                const paramOptions =
                                  paramPath && !listParamOptions.some((option) => option.value === paramPath)
                                    ? [{ value: paramPath, label: paramPath }, ...listParamOptions]
                                    : listParamOptions;

                                const patchCondition = (
                                  patch: Partial<{
                                    operator: PromptExploderLogicalOperator | null;
                                    paramPath: string;
                                    comparator: PromptExploderLogicalComparator;
                                    value: unknown;
                                  }>
                                ): void => {
                                  const nextOperator = patch.operator ?? parsedCondition?.operator ?? null;
                                  const nextParamPath = patch.paramPath ?? parsedCondition?.paramPath ?? '';
                                  const nextComparator =
                                    patch.comparator ??
                                    parsedCondition?.comparator ??
                                    (nextOperator === 'unless' ? 'falsy' : 'truthy');
                                  const nextValue =
                                    patch.value ?? parsedCondition?.value ?? null;
                                  const nextCondition = buildSubsectionConditionText({
                                    operator: nextOperator,
                                    paramPath: nextParamPath,
                                    comparator: nextComparator,
                                    value: nextValue,
                                  });
                                  updateSegment(selectedSegment.id, (current) => {
                                    const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                      candidateIndex === subsectionIndex
                                        ? {
                                          ...candidate,
                                          condition: nextCondition,
                                        }
                                        : candidate
                                    );
                                    return {
                                      ...current,
                                      subsections: nextSubsections,
                                    };
                                  });
                                };

                                return (
                                  <div className='grid gap-2 md:grid-cols-4'>
                                    <div className='space-y-1'>
                                      <Label className='text-[10px] text-gray-500'>Operator</Label>
                                      <SelectSimple
                                        size='sm'
                                        value={operatorValue}
                                        onValueChange={(next: string) => {
                                          if (next === 'none') {
                                            updateSegment(selectedSegment.id, (current) => {
                                              const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                                candidateIndex === subsectionIndex
                                                  ? {
                                                    ...candidate,
                                                    condition: null,
                                                  }
                                                  : candidate
                                              );
                                              return {
                                                ...current,
                                                subsections: nextSubsections,
                                              };
                                            });
                                            return;
                                          }
                                          patchCondition({
                                            operator: next as PromptExploderLogicalOperator,
                                          });
                                        }}
                                        options={PROMPT_EXPLODER_LOGICAL_OPERATOR_OPTIONS.map((option) => ({
                                          value: option.value,
                                          label: option.label,
                                        }))}
                                      />
                                    </div>

                                    <div className='space-y-1'>
                                      <Label className='text-[10px] text-gray-500'>Referenced Param</Label>
                                      <SelectSimple
                                        size='sm'
                                        value={paramPath}
                                        onValueChange={(next: string) => {
                                          patchCondition({
                                            paramPath: next.trim(),
                                          });
                                        }}
                                        options={
                                          paramOptions.length > 0
                                            ? paramOptions
                                            : [{ value: '', label: 'No parameters available' }]
                                        }
                                      />
                                    </div>

                                    <div className='space-y-1'>
                                      <Label className='text-[10px] text-gray-500'>Comparator</Label>
                                      <SelectSimple
                                        size='sm'
                                        value={comparatorValue}
                                        onValueChange={(next: string) => {
                                          if (!isLogicalComparator(next)) return;
                                          patchCondition({
                                            comparator: next,
                                            value:
                                              next === 'truthy' || next === 'falsy'
                                                ? null
                                                : parsedCondition?.value ?? null,
                                          });
                                        }}
                                        options={PROMPT_EXPLODER_LOGICAL_COMPARATOR_OPTIONS.map((option) => ({
                                          value: option.value,
                                          label: option.label,
                                        }))}
                                      />
                                    </div>

                                    <div className='space-y-1'>
                                      <Label className='text-[10px] text-gray-500'>Value</Label>
                                      {needsValue ? (
                                        selectedParamEntry?.spec?.kind === 'boolean' ? (
                                          <SelectSimple
                                            size='sm'
                                            value={String(Boolean(parsedCondition?.value))}
                                            onValueChange={(next: string) => {
                                              patchCondition({
                                                value: next === 'true',
                                              });
                                            }}
                                            options={[
                                              { value: 'true', label: 'true' },
                                              { value: 'false', label: 'false' },
                                            ]}
                                          />
                                        ) : (
                                          <Input
                                            value={formatLogicalValueText(parsedCondition?.value ?? '')}
                                            onChange={(event) => {
                                              patchCondition({
                                                value: parseLogicalValueText(event.target.value),
                                              });
                                            }}
                                          />
                                        )
                                      ) : (
                                        <div className='h-9 rounded border border-dashed border-border/60 bg-card/20 px-2 text-[11px] leading-9 text-gray-500'>
                                          {paramPath ? 'Value not needed' : 'Select parameter'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                              <PromptExploderHierarchyTreeProvider
                                value={{
                                  items: subsection.items,
                                  onChange: (nextItems) => {
                                    updateSegment(selectedSegment.id, (current) => {
                                      const nextSubsections = current.subsections.map((candidate, candidateIndex) => {
                                        if (candidateIndex !== subsectionIndex) return candidate;
                                        return {
                                          ...candidate,
                                          items: nextItems,
                                        };
                                      });
                                      return {
                                        ...current,
                                        subsections: nextSubsections,
                                      };
                                    });
                                  },
                                  renderLogicalEditor: ({ item, onChange }) =>
                                    renderListItemLogicalEditor({
                                      item,
                                      onChange,
                                    }),
                                  emptyLabel: 'No subsection items detected.',
                                }}
                              >
                                <PromptExploderHierarchyTreeEditor />
                              </PromptExploderHierarchyTreeProvider>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {selectedSegment.type === 'assigned_text' ? (
                        selectedCaseResolverStructuredDraft ? (
                          <div className='space-y-3 rounded border border-border/50 bg-card/20 p-3'>
                            <div className='text-[11px] uppercase tracking-wide text-gray-400'>
                              Structured Fields
                            </div>

                            {selectedCaseResolverStructuredDraft.kind === 'place_date' ? (
                              <div className='grid gap-2 md:grid-cols-4'>
                                <div className='space-y-1 md:col-span-2'>
                                  <Label className='text-[11px] text-gray-400'>City</Label>
                                  <Input
                                    value={selectedCaseResolverStructuredDraft.city}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      patchSelectedCaseResolverStructuredDraft((current) =>
                                        current.kind === 'place_date'
                                          ? {
                                            ...current,
                                            city: nextValue,
                                          }
                                          : current
                                      );
                                    }}
                                  />
                                </div>
                                <div className='space-y-1'>
                                  <Label className='text-[11px] text-gray-400'>Day</Label>
                                  <Input
                                    value={selectedCaseResolverStructuredDraft.day}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      patchSelectedCaseResolverStructuredDraft((current) =>
                                        current.kind === 'place_date'
                                          ? {
                                            ...current,
                                            day: nextValue,
                                          }
                                          : current
                                      );
                                    }}
                                  />
                                </div>
                                <div className='space-y-1'>
                                  <Label className='text-[11px] text-gray-400'>Month</Label>
                                  <Input
                                    value={selectedCaseResolverStructuredDraft.month}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      patchSelectedCaseResolverStructuredDraft((current) =>
                                        current.kind === 'place_date'
                                          ? {
                                            ...current,
                                            month: nextValue,
                                          }
                                          : current
                                      );
                                    }}
                                  />
                                </div>
                                <div className='space-y-1'>
                                  <Label className='text-[11px] text-gray-400'>Year</Label>
                                  <Input
                                    value={selectedCaseResolverStructuredDraft.year}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      patchSelectedCaseResolverStructuredDraft((current) =>
                                        current.kind === 'place_date'
                                          ? {
                                            ...current,
                                            year: nextValue,
                                          }
                                          : current
                                      );
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className='text-[11px] text-gray-500'>
                                  {selectedCaseResolverStructuredDraft.role === 'addresser'
                                    ? 'Addresser fields'
                                    : 'Addressee fields'}
                                </div>
                                <div className='grid gap-2 md:grid-cols-4'>
                                  <div className='space-y-1 md:col-span-2'>
                                    <Label className='text-[11px] text-gray-400'>Company Name</Label>
                                    <Input
                                      value={selectedCaseResolverStructuredDraft.companyName}
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        patchSelectedCaseResolverStructuredDraft((current) =>
                                          current.kind === 'party'
                                            ? {
                                              ...current,
                                              companyName: nextValue,
                                            }
                                            : current
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <Label className='text-[11px] text-gray-400'>Name</Label>
                                    <Input
                                      value={selectedCaseResolverStructuredDraft.name}
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        patchSelectedCaseResolverStructuredDraft((current) =>
                                          current.kind === 'party'
                                            ? {
                                              ...current,
                                              name: nextValue,
                                            }
                                            : current
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <Label className='text-[11px] text-gray-400'>Middle Name</Label>
                                    <Input
                                      value={selectedCaseResolverStructuredDraft.middleName}
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        patchSelectedCaseResolverStructuredDraft((current) =>
                                          current.kind === 'party'
                                            ? {
                                              ...current,
                                              middleName: nextValue,
                                            }
                                            : current
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <Label className='text-[11px] text-gray-400'>Last Name</Label>
                                    <Input
                                      value={selectedCaseResolverStructuredDraft.lastName}
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        patchSelectedCaseResolverStructuredDraft((current) =>
                                          current.kind === 'party'
                                            ? {
                                              ...current,
                                              lastName: nextValue,
                                            }
                                            : current
                                        );
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className='grid gap-2 md:grid-cols-5'>
                                  <div className='space-y-1 md:col-span-2'>
                                    <Label className='text-[11px] text-gray-400'>Street</Label>
                                    <Input
                                      value={selectedCaseResolverStructuredDraft.street}
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        patchSelectedCaseResolverStructuredDraft((current) =>
                                          current.kind === 'party'
                                            ? {
                                              ...current,
                                              street: nextValue,
                                            }
                                            : current
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <Label className='text-[11px] text-gray-400'>Street Number</Label>
                                    <Input
                                      value={selectedCaseResolverStructuredDraft.streetNumber}
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        patchSelectedCaseResolverStructuredDraft((current) =>
                                          current.kind === 'party'
                                            ? {
                                              ...current,
                                              streetNumber: nextValue,
                                            }
                                            : current
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <Label className='text-[11px] text-gray-400'>House Number</Label>
                                    <Input
                                      value={selectedCaseResolverStructuredDraft.houseNumber}
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        patchSelectedCaseResolverStructuredDraft((current) =>
                                          current.kind === 'party'
                                            ? {
                                              ...current,
                                              houseNumber: nextValue,
                                            }
                                            : current
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <Label className='text-[11px] text-gray-400'>Postal Code</Label>
                                    <Input
                                      value={selectedCaseResolverStructuredDraft.postalCode}
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        patchSelectedCaseResolverStructuredDraft((current) =>
                                          current.kind === 'party'
                                            ? {
                                              ...current,
                                              postalCode: nextValue,
                                            }
                                            : current
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <Label className='text-[11px] text-gray-400'>City</Label>
                                    <Input
                                      value={selectedCaseResolverStructuredDraft.city}
                                      onChange={(event) => {
                                        const nextValue = event.target.value;
                                        patchSelectedCaseResolverStructuredDraft((current) =>
                                          current.kind === 'party'
                                            ? {
                                              ...current,
                                              city: nextValue,
                                            }
                                            : current
                                        );
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className='space-y-1'>
                                  <Label className='text-[11px] text-gray-400'>Country</Label>
                                  <Input
                                    value={selectedCaseResolverStructuredDraft.country}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      patchSelectedCaseResolverStructuredDraft((current) =>
                                        current.kind === 'party'
                                          ? {
                                            ...current,
                                            country: nextValue,
                                          }
                                          : current
                                      );
                                    }}
                                  />
                                </div>
                              </>
                            )}

                            <div className='space-y-1'>
                              <Label className='text-[11px] text-gray-400'>Body Preview</Label>
                              <div className='min-h-[120px] w-full whitespace-pre-wrap rounded-md border border-foreground/10 bg-foreground/[0.03] px-3 py-2 font-mono text-[12px] text-gray-300'>
                                {selectedSegment.text}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            <Label className='text-[11px] text-gray-400'>Body</Label>
                            <Textarea
                              className='min-h-[180px] font-mono text-[12px]'
                              value={selectedSegment.text}
                              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                                updateSegment(selectedSegment.id, (current) => ({
                                  ...current,
                                  text: event.target.value,
                                }));
                              }}
                            />
                          </div>
                        )
                      ) : null}

                      <div className='space-y-3 rounded border border-border/60 bg-card/30 p-2 text-[11px] text-gray-400'>
                        <div className='text-[11px] uppercase tracking-wide text-gray-400'>
                          Matched Rule Insights
                        </div>
                        {matchedRuleDetails.length === 0 ? (
                          <div className='text-[11px] text-gray-500'>
                            No matched patterns for this segment.
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            {matchedRuleDetails.map((matchedRule) => (
                              <div
                                key={matchedRule.id}
                                className='rounded border border-border/50 bg-card/20 p-2'
                              >
                                <div className='flex items-center justify-between gap-2'>
                                  <span className='truncate text-[11px] font-medium text-gray-200'>
                                    {matchedRule.title}
                                  </span>
                                  <span className='rounded border border-border/50 bg-card/40 px-1 py-0.5 text-[10px] text-gray-300'>
                                    {matchedRule.segmentType ?? 'no type hint'}
                                  </span>
                                </div>
                                <div className='mt-1 text-[10px] text-gray-500'>
                                  id: <span className='font-mono'>{matchedRule.id}</span> · priority{' '}
                                  {matchedRule.priority} · boost{' '}
                                  {matchedRule.confidenceBoost.toFixed(2)} · heading{' '}
                                  {matchedRule.treatAsHeading ? 'yes' : 'no'}
                                </div>
                                {matchedRule.sequenceLabel ? (
                                  <div className='mt-1 text-[10px] text-gray-500'>
                                    sequence: {matchedRule.sequenceLabel}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className='border-t border-border/60 pt-3'>
                          <div className='mb-1 text-[11px] uppercase tracking-wide text-gray-400'>
                            Similar Learned Templates
                          </div>
                          <div className='grid gap-2 md:grid-cols-2'>
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-gray-400'>Template Merge Mode</Label>
                              <SelectSimple
                                size='sm'
                                value={approvalDraft.templateMergeMode}
                                onValueChange={(value: string) => {
                                  const nextMode = value as TemplateMergeMode;
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    templateMergeMode: nextMode,
                                    templateTargetId:
                                      nextMode === 'target'
                                        ? (previous.templateTargetId ||
                                          templateTargetOptions[0]?.value ||
                                          '')
                                        : '',
                                  }));
                                }}
                                options={[
                                  { value: 'auto', label: 'Auto (exact/similar)' },
                                  { value: 'new', label: 'Force New Template' },
                                  { value: 'target', label: 'Merge Into Selected Template' },
                                ]}
                              />
                            </div>
                            {approvalDraft.templateMergeMode === 'target' ? (
                              <div className='space-y-1'>
                                <Label className='text-[11px] text-gray-400'>Merge Target Template</Label>
                                <SelectSimple
                                  size='sm'
                                  value={approvalDraft.templateTargetId}
                                  onValueChange={(value: string) => {
                                    setApprovalDraft((previous) => ({
                                      ...previous,
                                      templateTargetId: value,
                                    }));
                                  }}
                                  options={
                                    templateTargetOptions.length > 0
                                      ? templateTargetOptions
                                      : [{ value: '', label: 'No templates for this type' }]
                                  }
                                />
                              </div>
                            ) : null}
                          </div>
                          <div className='mb-2 text-[10px] text-gray-500'>
                            Merge eligibility: same segment type + score &gt;=
                            {' '}{templateMergeThreshold.toFixed(2)}
                          </div>
                          {similarTemplateCandidates.length === 0 ? (
                            <div className='text-[11px] text-gray-500'>
                              No nearby learned templates for this segment yet.
                            </div>
                          ) : (
                            <div className='space-y-2'>
                              {similarTemplateCandidates.map((candidate) => (
                                <div
                                  key={candidate.id}
                                  className='rounded border border-border/50 bg-card/20 p-2'
                                >
                                  <div className='flex items-center justify-between gap-2'>
                                    <span className='truncate text-[11px] font-medium text-gray-200'>
                                      {candidate.title}
                                    </span>
                                    <span
                                      className={`rounded border px-1 py-0.5 text-[10px] ${
                                        candidate.mergeEligible
                                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                          : 'border-border/50 bg-card/40 text-gray-300'
                                      }`}
                                    >
                                      {candidate.mergeEligible ? 'merge target' : 'candidate'}
                                    </span>
                                  </div>
                                  <div className='mt-1 text-[10px] text-gray-500'>
                                    score {(candidate.score * 100).toFixed(1)}% ·
                                    {' '}type {candidate.segmentType} ·
                                    {' '}state {candidate.state} · approvals {candidate.approvals}
                                  </div>
                                  <div className='mt-1 flex justify-end'>
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='sm'
                                      onClick={() => {
                                        setApprovalDraft((previous) => ({
                                          ...previous,
                                          templateMergeMode: 'target',
                                          templateTargetId: candidate.id,
                                        }));
                                      }}
                                    >
                                      Use Target
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className='border-t border-border/60 pt-3'>
                          <div className='mb-2 text-[11px] uppercase tracking-wide text-gray-400'>
                            Approval Rule Draft
                          </div>
                          <div className='grid gap-2 md:grid-cols-2'>
                            <div className='space-y-1 md:col-span-2'>
                              <Label className='text-[11px] text-gray-400'>Rule Title</Label>
                              <Input
                                value={approvalDraft.ruleTitle}
                                onChange={(event) => {
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    ruleTitle: event.target.value,
                                  }));
                                }}
                              />
                            </div>
                            <div className='space-y-1 md:col-span-2'>
                              <Label className='text-[11px] text-gray-400'>Rule Pattern</Label>
                              <Textarea
                                className='min-h-[70px] font-mono text-[12px]'
                                value={approvalDraft.rulePattern}
                                onChange={(event) => {
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    rulePattern: event.target.value,
                                  }));
                                }}
                              />
                            </div>
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-gray-400'>Segment Type Hint</Label>
                              <SelectSimple
                                size='sm'
                                value={approvalDraft.ruleSegmentType}
                                onValueChange={(value: string) => {
                                  const nextSegmentType = value as PromptExploderSegment['type'];
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    ruleSegmentType: nextSegmentType,
                                    templateTargetId:
                                      previous.templateMergeMode === 'target'
                                        ? (effectiveLearnedTemplates.find(
                                          (template) =>
                                            template.id === previous.templateTargetId &&
                                            template.segmentType === nextSegmentType
                                        )?.id ??
                                          effectiveLearnedTemplates.find(
                                            (template) =>
                                              template.segmentType === nextSegmentType
                                          )?.id ??
                                          '')
                                        : previous.templateTargetId,
                                    templateMergeMode:
                                      previous.templateMergeMode === 'target' &&
                                      !effectiveLearnedTemplates.some(
                                        (template) =>
                                          template.id === previous.templateTargetId &&
                                          template.segmentType === nextSegmentType
                                      ) &&
                                      !effectiveLearnedTemplates.some(
                                        (template) =>
                                          template.segmentType === nextSegmentType
                                      )
                                        ? 'auto'
                                        : previous.templateMergeMode,
                                  }));
                                }}
                                options={[
                                  { value: 'metadata', label: 'Metadata' },
                                  { value: 'assigned_text', label: 'Assigned Text' },
                                  { value: 'list', label: 'List' },
                                  { value: 'parameter_block', label: 'Parameter Block' },
                                  { value: 'referential_list', label: 'Referential List' },
                                  { value: 'sequence', label: 'Sequence' },
                                  { value: 'hierarchical_list', label: 'Hierarchical List' },
                                  { value: 'conditional_list', label: 'Conditional List' },
                                  { value: 'qa_matrix', label: 'QA Matrix' },
                                ]}
                              />
                            </div>
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-gray-400'>Priority</Label>
                              <Input
                                type='number'
                                min={-50}
                                max={50}
                                step={1}
                                value={String(approvalDraft.rulePriority)}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  if (!Number.isFinite(value)) return;
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    rulePriority: promptExploderClampNumber(Math.floor(value), -50, 50),
                                  }));
                                }}
                              />
                            </div>
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-gray-400'>Confidence Boost</Label>
                              <Input
                                type='number'
                                min={0}
                                max={0.5}
                                step={0.05}
                                value={approvalDraft.ruleConfidenceBoost.toFixed(2)}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  if (!Number.isFinite(value)) return;
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    ruleConfidenceBoost: promptExploderClampNumber(value, 0, 0.5),
                                  }));
                                }}
                              />
                            </div>
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-gray-400'>Treat As Heading</Label>
                              <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
                                <StatusToggle
                                  enabled={approvalDraft.ruleTreatAsHeading}
                                  onToggle={() => {
                                    setApprovalDraft((previous) => ({
                                      ...previous,
                                      ruleTreatAsHeading: !previous.ruleTreatAsHeading,
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className='mt-2 flex items-center justify-between gap-2 text-[10px] text-gray-500'>
                            <span>Approvals train fuzzy recognition and save this rule draft into validator patterns.</span>
                            <div className='flex items-center gap-2'>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setApprovalDraft(
                                    createApprovalDraftFromSegment(selectedSegment)
                                  );
                                }}
                              >
                                Reset Draft
                              </Button>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  void handleApproveSelectedSegmentPattern();
                                }}
                                disabled={updateSetting.isPending}
                              >
                                Approve Pattern
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </FormSection>
        </div>

        <div className='min-w-0 space-y-4'>
          <FormSection
            title='Bindings'
            description='Auto-detected links between references and parameter usage.'
            variant='subtle'
            className='p-4'
          >
            {!documentState ? (
              <div className='text-xs text-gray-500'>Explode a prompt to manage bindings.</div>
            ) : (
              <div className='space-y-3'>
                <div className='rounded border border-border/50 bg-card/20 p-2'>
                  <div className='grid gap-2'>
                    <div className='grid gap-2 md:grid-cols-3'>
                      <SelectSimple
                        size='sm'
                        value={bindingDraft.type}
                        onValueChange={(value: string) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            type: value as PromptExploderBindingType,
                          }));
                        }}
                        options={[
                          { value: 'depends_on', label: 'Depends On' },
                          { value: 'references', label: 'References' },
                          { value: 'uses_param', label: 'Uses Param' },
                        ]}
                      />
                      <SelectSimple
                        size='sm'
                        value={bindingDraft.fromSegmentId}
                        onValueChange={(value: string) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            fromSegmentId: value,
                            fromSubsectionId: '',
                          }));
                        }}
                        options={segmentOptions}
                      />
                      <SelectSimple
                        size='sm'
                        value={bindingDraft.fromSubsectionId}
                        onValueChange={(value: string) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            fromSubsectionId: value,
                          }));
                        }}
                        options={fromSubsectionOptions}
                      />
                    </div>
                    <div className='grid gap-2 md:grid-cols-2'>
                      <SelectSimple
                        size='sm'
                        value={bindingDraft.toSegmentId}
                        onValueChange={(value: string) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            toSegmentId: value,
                            toSubsectionId: '',
                          }));
                        }}
                        options={segmentOptions}
                      />
                      <SelectSimple
                        size='sm'
                        value={bindingDraft.toSubsectionId}
                        onValueChange={(value: string) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            toSubsectionId: value,
                          }));
                        }}
                        options={toSubsectionOptions}
                      />
                    </div>
                    <div className='grid gap-2 md:grid-cols-2'>
                      <Input
                        value={bindingDraft.sourceLabel}
                        onChange={(event) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            sourceLabel: event.target.value,
                          }));
                        }}
                        placeholder='Source label (optional)'
                      />
                      <Input
                        value={bindingDraft.targetLabel}
                        onChange={(event) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            targetLabel: event.target.value,
                          }));
                        }}
                        placeholder='Target label (optional)'
                      />
                    </div>
                    <div className='flex justify-end'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={handleAddManualBinding}
                        disabled={segmentOptions.length === 0}
                      >
                        <Plus className='mr-2 size-3.5' />
                        Add Manual Binding
                      </Button>
                    </div>
                  </div>
                </div>

                {documentState.bindings.length === 0 ? (
                  <div className='text-xs text-gray-500'>No bindings detected.</div>
                ) : (
                  <div className='max-h-[280px] space-y-2 overflow-auto'>
                    {documentState.bindings.map((binding) => (
                      <div key={binding.id} className='rounded border border-border/50 bg-card/20 p-2 text-xs'>
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex items-center gap-2 text-gray-200'>
                            <Link2 className='size-3.5' />
                            <span className='uppercase text-[10px] tracking-wide text-gray-500'>
                              {binding.type.replaceAll('_', ' ')}
                            </span>
                            <span className='rounded border border-border/60 px-1 py-0.5 text-[9px] uppercase text-gray-400'>
                              {binding.origin}
                            </span>
                          </div>
                          {binding.origin === 'manual' ? (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => handleRemoveManualBinding(binding.id)}
                              title='Remove manual binding'
                              aria-label='Remove manual binding'
                            >
                              <Trash2 className='size-3.5' />
                            </Button>
                          ) : null}
                        </div>
                        <div className='mt-1 text-gray-300'>
                          {binding.sourceLabel} → {binding.targetLabel}
                        </div>
                        <div className='mt-1 text-[10px] text-gray-500'>
                          {describeBindingEndpoint(binding.fromSegmentId, binding.fromSubsectionId)} →{' '}
                          {describeBindingEndpoint(binding.toSegmentId, binding.toSubsectionId)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </FormSection>

          <FormSection
            title='Warnings'
            description='Quality checks from the exploder runtime.'
            variant='subtle'
            className='p-4'
          >
            {!documentState || documentState.warnings.length === 0 ? (
              <div className='text-xs text-gray-500'>No warnings.</div>
            ) : (
              <ul className='list-disc pl-5 text-xs text-amber-200'>
                {documentState.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </FormSection>

          <FormSection
            title='Reassembled Prompt'
            description='Preview final output after include/omit and reorder edits.'
            variant='subtle'
            className='p-4'
            actions={
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleReassemblePrompt}
                  disabled={!documentState}
                >
                  Reassemble Text
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleApplyToImageStudio}
                  disabled={!documentState}
                >
                  {applyOutputLabel}
                </Button>
              </div>
            }
          >
            <div className='mt-2'>
              <Textarea
                className='min-h-[420px] font-mono text-[11px]'
                value={documentState?.reassembledPrompt ?? ''}
                readOnly
              />
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  );
}
