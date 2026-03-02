import { describe, expect, it } from 'vitest';

import { PROMPT_EXPLODER_PATTERN_PACK } from '@/features/prompt-exploder/pattern-pack';
import {
  buildCaseResolverSegmentCaptureRules,
  type CaseResolverSegmentCaptureRule,
  extractCaseResolverBridgePayloadFromSegments,
  resolveCaseResolverBridgePayloadForTransfer,
} from '@/features/prompt-exploder/utils/case-resolver-extraction';
import type { PromptExploderSegment } from '@/shared/contracts/prompt-exploder';

const createSegment = (input: {
  id: string;
  raw: string;
  matchedPatternIds?: string[];
  matchedPatternLabels?: string[];
  matchedSequenceLabels?: string[];
}): PromptExploderSegment => ({
  id: input.id,
  type: 'assigned_text',
  title: '',
  includeInOutput: true,
  text: input.raw,
  raw: input.raw,
  code: null,
  condition: null,
  items: [],
  listItems: [],
  subsections: [],
  paramsText: '',
  paramsObject: null,
  paramUiControls: {},
  paramComments: {},
  paramDescriptions: {},
  matchedPatternIds: input.matchedPatternIds ?? [],
  matchedPatternLabels: input.matchedPatternLabels ?? [],
  matchedSequenceLabels: input.matchedSequenceLabels ?? [],
  confidence: 1,
  validationResults: [],
  segments: [],
});

describe('case resolver extraction bridge payload', () => {
  const captureRules = buildCaseResolverSegmentCaptureRules(
    PROMPT_EXPLODER_PATTERN_PACK,
    'case_resolver_prompt_exploder'
  );

  it('matches capture rules for dashed and underscored case resolver scopes', () => {
    const dashedScopeRules = buildCaseResolverSegmentCaptureRules(
      PROMPT_EXPLODER_PATTERN_PACK,
      'case-resolver-prompt-exploder'
    );

    expect(dashedScopeRules.length).toBeGreaterThan(0);
    expect(dashedScopeRules.map((rule) => rule.id)).toEqual(captureRules.map((rule) => rule.id));
  });

  it('extracts parties and place/date metadata from case resolver segments', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'segment-place-date',
        raw: 'Szczecin 25.01.2026',
        matchedPatternIds: [
          'segment.case_resolver.heading.place_date',
          'segment.case_resolver.extract.place_date.city',
          'segment.case_resolver.extract.place_date.day',
          'segment.case_resolver.extract.place_date.month',
          'segment.case_resolver.extract.place_date.year',
        ],
        matchedPatternLabels: ['Case Resolver Heading: Place + Date'],
        matchedSequenceLabels: ['Case Resolver Structure'],
      }),
      createSegment({
        id: 'segment-addresser',
        raw: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPolska',
        matchedPatternIds: [
          'segment.case_resolver.heading.addresser_person',
          'segment.case_resolver.extract.addresser.first_name',
          'segment.case_resolver.extract.addresser.last_name',
          'segment.case_resolver.extract.address.street',
          'segment.case_resolver.extract.address.postal_code',
          'segment.case_resolver.extract.address.city',
          'segment.case_resolver.extract.address.country',
        ],
        matchedPatternLabels: ['Case Resolver Role: Addresser'],
        matchedSequenceLabels: ['Case Resolver Parties'],
      }),
      createSegment({
        id: 'segment-addressee',
        raw: 'Inspektorat ZUS w Gryficach\nDąbskiego 5\n72-300 Gryfice',
        matchedPatternIds: [
          'segment.case_resolver.heading.addressee_organization',
          'segment.case_resolver.extract.addressee.organization_name',
          'segment.case_resolver.extract.address.street',
          'segment.case_resolver.extract.address.postal_code',
          'segment.case_resolver.extract.address.city',
        ],
        matchedPatternLabels: ['Case Resolver Role: Addressee'],
        matchedSequenceLabels: ['Case Resolver Parties'],
      }),
    ];

    const payload = extractCaseResolverBridgePayloadFromSegments(segments, {
      captureRules,
      mode: 'rules_only',
    });

    expect(payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload.parties?.addresser?.kind).toBe('person');
    expect(payload.parties?.addresser?.firstName).toBe('Michał');
    expect(payload.parties?.addresser?.lastName).toBe('Matynia');
    expect(payload.parties?.addresser?.street).toBe('Fioletowa');
    expect(payload.parties?.addresser?.streetNumber).toBe('71');
    expect(payload.parties?.addresser?.houseNumber).toBe('2');
    expect(payload.parties?.addresser?.postalCode).toBe('70-781');
    expect(payload.parties?.addresser?.city).toBe('Szczecin');
    expect(payload.parties?.addresser?.country).toBe('Poland');

    expect(payload.parties?.addressee?.displayName).toBe('Inspektorat ZUS w Gryficach');
    expect(payload.parties?.addressee?.kind).toBe('organization');
    expect(payload.parties?.addressee?.organizationName).toBe('Inspektorat ZUS w Gryficach');
    expect(payload.parties?.addressee?.street).toBe('Dąbskiego');
    expect(payload.parties?.addressee?.streetNumber).toBe('5');
    expect(payload.parties?.addressee?.postalCode).toBe('72-300');
    expect(payload.parties?.addressee?.city).toBe('Gryfice');

    expect(payload.metadata?.placeDate).toEqual({
      city: 'Szczecin',
      day: '25',
      month: '01',
      year: '2026',
      sourceSegmentId: 'segment-place-date',
      sourceSegmentTitle: 'Szczecin 25.01.2026',
      sourcePatternLabels: ['Case Resolver Heading: Place + Date'],
      sourceSequenceLabels: ['Case Resolver Structure'],
    });
  });

  it('does not apply hidden extraction when explicit capture rules are missing', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'heuristic-place-date',
        raw: 'Szczecin 25.01.2026',
      }),
      createSegment({
        id: 'heuristic-addresser',
        raw: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPolska',
      }),
      createSegment({
        id: 'heuristic-addressee',
        raw: 'Inspektorat ZUS w Gryficach\nDąbskiego 5\n72-300 Gryfice',
      }),
    ];

    const payload = extractCaseResolverBridgePayloadFromSegments(segments, {
      captureRules: [],
      mode: 'rules_only',
    });

    expect(payload.parties).toBeUndefined();
    expect(payload.metadata).toBeUndefined();
  });

  it('allows optional heuristic fallback only when explicitly enabled', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'heuristic-place-date',
        raw: 'Szczecin 25.01.2026',
      }),
      createSegment({
        id: 'heuristic-addresser',
        raw: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPolska',
      }),
      createSegment({
        id: 'heuristic-addressee',
        raw: 'Inspektorat ZUS w Gryficach\nDąbskiego 5\n72-300 Gryfice',
      }),
    ];

    const payload = extractCaseResolverBridgePayloadFromSegments(segments, {
      captureRules: [],
      mode: 'rules_with_heuristics',
    });

    expect(payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload.parties?.addressee?.displayName).toBe('Inspektorat ZUS w Gryficach');
    expect(payload.metadata?.placeDate?.city).toBe('Szczecin');
    expect(payload.metadata?.placeDate?.day).toBe('25');
    expect(payload.metadata?.placeDate?.month).toBe('01');
    expect(payload.metadata?.placeDate?.year).toBe('2026');
  });

  it('detects ZUS addressee organizations in heuristics mode', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'heuristic-addresser-zus',
        raw: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPolska',
      }),
      createSegment({
        id: 'heuristic-addressee-zus',
        raw: 'Zakład Ubezpieczeń Społecznych\nOddział w Szczecinie\nMatejki 22\n70-530 Szczecin',
      }),
    ];

    const payload = extractCaseResolverBridgePayloadFromSegments(segments, {
      captureRules: [],
      mode: 'rules_with_heuristics',
    });

    expect(payload.parties?.addressee?.displayName).toBe('Zakład Ubezpieczeń Społecznych');
    expect(payload.parties?.addressee?.organizationName).toBe('Zakład Ubezpieczeń Społecznych');
    expect(payload.parties?.addressee?.kind).toBe('organization');
    expect(payload.parties?.addressee?.street).toBe('Matejki');
    expect(payload.parties?.addressee?.streetNumber).toBe('22');
    expect(payload.parties?.addressee?.postalCode).toBe('70-530');
    expect(payload.parties?.addressee?.city).toBe('Szczecin');
  });

  it('captures Zakład Ubezpieczeń addressee in rules-only mode without explicit role pattern ids', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'rules-addresser',
        raw: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPolska',
        matchedPatternIds: [
          'segment.case_resolver.extract.address.street',
          'segment.case_resolver.extract.address.postal_code',
          'segment.case_resolver.extract.address.city',
          'segment.case_resolver.extract.address.country',
        ],
      }),
      createSegment({
        id: 'rules-addressee-zus',
        raw: 'Zakład Ubezpieczeń Społecznych\nOddział w Szczecinie\nMatejki 22\n70-530 Szczecin',
        matchedPatternIds: [
          'segment.case_resolver.extract.address.street',
          'segment.case_resolver.extract.address.postal_code',
          'segment.case_resolver.extract.address.city',
        ],
      }),
    ];

    const payload = extractCaseResolverBridgePayloadFromSegments(segments, {
      captureRules,
      mode: 'rules_only',
    });

    expect(payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload.parties?.addresser?.kind).toBe('person');
    expect(payload.parties?.addressee?.displayName).toBe('Zakład Ubezpieczeń Społecznych');
    expect(payload.parties?.addressee?.organizationName).toBe('Zakład Ubezpieczeń Społecznych');
    expect(payload.parties?.addressee?.kind).toBe('organization');
    expect(payload.parties?.addressee?.street).toBe('Matejki');
    expect(payload.parties?.addressee?.streetNumber).toBe('22');
    expect(payload.parties?.addressee?.postalCode).toBe('70-530');
    expect(payload.parties?.addressee?.city).toBe('Szczecin');
  });

  it('captures police addressee organization in rules-only mode', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'rules-addresser-police',
        raw: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPolska',
        matchedPatternIds: [
          'segment.case_resolver.heading.addresser_person',
          'segment.case_resolver.extract.addresser.first_name',
          'segment.case_resolver.extract.addresser.last_name',
          'segment.case_resolver.extract.address.street',
          'segment.case_resolver.extract.address.street_number',
          'segment.case_resolver.extract.address.house_number',
          'segment.case_resolver.extract.address.postal_code',
          'segment.case_resolver.extract.address.city',
          'segment.case_resolver.extract.address.country',
        ],
      }),
      createSegment({
        id: 'rules-addressee-police',
        raw: 'Komisariat Policji Szczecin–Dąbie\nul. Pomorska 15\n70-812 Szczecin',
        matchedPatternIds: [
          'segment.case_resolver.heading.addressee_organization',
          'segment.case_resolver.extract.addressee.organization_name',
          'segment.case_resolver.extract.address.street',
          'segment.case_resolver.extract.address.street_number',
          'segment.case_resolver.extract.address.postal_code',
          'segment.case_resolver.extract.address.city',
        ],
      }),
    ];

    const payload = extractCaseResolverBridgePayloadFromSegments(segments, {
      captureRules,
      mode: 'rules_only',
    });

    expect(payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload.parties?.addresser?.kind).toBe('person');
    expect(payload.parties?.addressee?.displayName).toBe('Komisariat Policji Szczecin–Dąbie');
    expect(payload.parties?.addressee?.organizationName).toBe('Komisariat Policji Szczecin–Dąbie');
    expect(payload.parties?.addressee?.kind).toBe('organization');
    expect(payload.parties?.addressee?.street).toBe('Pomorska');
    expect(payload.parties?.addressee?.streetNumber).toBe('15');
    expect(payload.parties?.addressee?.postalCode).toBe('70-812');
    expect(payload.parties?.addressee?.city).toBe('Szczecin');
  });

  it('does not apply transfer fallback when rules-only mode has no captures', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'heuristic-place-date',
        raw: 'Szczecin 25.01.2026',
      }),
      createSegment({
        id: 'heuristic-addresser',
        raw: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPolska',
      }),
      createSegment({
        id: 'heuristic-addressee',
        raw: 'Inspektorat ZUS w Gryficach\nDąbskiego 5\n72-300 Gryfice',
      }),
    ];

    const result = resolveCaseResolverBridgePayloadForTransfer({
      segments,
      captureRules: [],
      mode: 'rules_only',
    });

    expect(result.requestedMode).toBe('rules_only');
    expect(result.effectiveMode).toBe('rules_only');
    expect(result.usedFallback).toBe(false);
    expect(result.hasCaptureData).toBe(false);
    expect(result.payload.parties).toBeUndefined();
    expect(result.payload.metadata).toBeUndefined();
  });

  it('does not fill missing roles heuristically when rules-only mode has only partial rule captures', () => {
    const addresserOnlyRules: CaseResolverSegmentCaptureRule[] = [
      {
        id: 'capture.addresser.display_name',
        label: 'Capture addresser display name',
        role: 'addresser',
        field: 'displayName',
        regex: /^(Michał Matynia)$/imu,
        applyTo: 'line',
        group: 1,
        normalize: 'trim',
        overwrite: true,
        sequence: 1,
      },
    ];
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'partial-addresser',
        raw: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPolska',
      }),
      createSegment({
        id: 'partial-addressee',
        raw: 'Inspektorat ZUS w Gryficach\nDąbskiego 5\n72-300 Gryfice',
      }),
    ];

    const result = resolveCaseResolverBridgePayloadForTransfer({
      segments,
      captureRules: addresserOnlyRules,
      mode: 'rules_only',
    });

    expect(result.requestedMode).toBe('rules_only');
    expect(result.effectiveMode).toBe('rules_only');
    expect(result.usedFallback).toBe(false);
    expect(result.hasCaptureData).toBe(true);
    expect(result.payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(result.payload.parties?.addresser?.rawText).toContain('Fioletowa 71/2');
    expect(result.payload.parties?.addresser?.rawText).toContain('\n');
    expect(result.payload.parties?.addressee).toBeUndefined();
  });

  it('reports no transfer captures when both rule and fallback extraction fail', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'plain',
        raw: 'Treść dokumentu bez danych adresowych i daty.',
      }),
    ];

    const result = resolveCaseResolverBridgePayloadForTransfer({
      segments,
      captureRules: [],
      mode: 'rules_only',
    });

    expect(result.requestedMode).toBe('rules_only');
    expect(result.usedFallback).toBe(false);
    expect(result.hasCaptureData).toBe(false);
    expect(result.payload.parties).toBeUndefined();
    expect(result.payload.metadata).toBeUndefined();
  });

  it('captures labeled sender and recipient blocks in separate segments in rules-only mode', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'sender-labeled',
        raw: 'From:\nMichał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPolska',
      }),
      createSegment({
        id: 'recipient-labeled',
        raw: 'To:\nKomisariat Policji Szczecin–Dąbie\nul. Pomorska 15\n70-812 Szczecin',
      }),
    ];

    const payload = extractCaseResolverBridgePayloadFromSegments(segments, {
      captureRules,
      mode: 'rules_only',
    });

    expect(payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload.parties?.addresser?.firstName).toBe('Michał');
    expect(payload.parties?.addresser?.lastName).toBe('Matynia');
    expect(payload.parties?.addresser?.street).toBe('Fioletowa');
    expect(payload.parties?.addresser?.streetNumber).toBe('71');
    expect(payload.parties?.addresser?.houseNumber).toBe('2');
    expect(payload.parties?.addresser?.postalCode).toBe('70-781');
    expect(payload.parties?.addresser?.city).toBe('Szczecin');
    expect(payload.parties?.addresser?.country).toBe('Poland');
    expect(payload.parties?.addressee?.displayName).toBe('Komisariat Policji Szczecin–Dąbie');
    expect(payload.parties?.addressee?.organizationName).toBe(
      'Komisariat Policji Szczecin–Dąbie'
    );
    expect(payload.parties?.addressee?.street).toBe('Pomorska');
    expect(payload.parties?.addressee?.streetNumber).toBe('15');
    expect(payload.parties?.addressee?.postalCode).toBe('70-812');
    expect(payload.parties?.addressee?.city).toBe('Szczecin');
  });

  it('splits combined labeled sender and recipient content into separate party captures', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'combined-labeled',
        raw: [
          'From:',
          'Michał Matynia',
          'Fioletowa 71/2',
          '70-781 Szczecin',
          'Polska',
          '',
          'To:',
          'Komisariat Policji Szczecin–Dąbie',
          'ul. Pomorska 15',
          '70-812 Szczecin',
        ].join('\n'),
      }),
    ];

    const payload = extractCaseResolverBridgePayloadFromSegments(segments, {
      captureRules,
      mode: 'rules_only',
    });

    expect(payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload.parties?.addresser?.sourceSegmentId).toBe('combined-labeled');
    expect(payload.parties?.addresser?.sourcePatternLabels).toContain(
      'Case Resolver Virtual Split: Addresser'
    );
    expect(payload.parties?.addressee?.displayName).toBe('Komisariat Policji Szczecin–Dąbie');
    expect(payload.parties?.addressee?.sourceSegmentId).toBe('combined-labeled');
    expect(payload.parties?.addressee?.sourcePatternLabels).toContain(
      'Case Resolver Virtual Split: Addressee'
    );
    expect(payload.parties?.addressee?.street).toBe('Pomorska');
    expect(payload.parties?.addressee?.streetNumber).toBe('15');
    expect(payload.parties?.addressee?.postalCode).toBe('70-812');
    expect(payload.parties?.addressee?.city).toBe('Szczecin');
    expect(payload.parties?.addressee?.country).toBeUndefined();
  });

  it('captures inline labeled sender and person recipient blocks in rules-only mode', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'inline-labeled',
        raw: [
          'From: Michał Matynia',
          'Fioletowa 71/2',
          '70-781 Szczecin',
          'Polska',
          '',
          'To: Jan Kowalski',
          'ul. Jasna 12/4',
          '00-013 Warszawa',
        ].join('\n'),
      }),
    ];

    const payload = extractCaseResolverBridgePayloadFromSegments(segments, {
      captureRules,
      mode: 'rules_only',
    });

    expect(payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload.parties?.addresser?.firstName).toBe('Michał');
    expect(payload.parties?.addresser?.lastName).toBe('Matynia');
    expect(payload.parties?.addressee?.displayName).toBe('Jan Kowalski');
    expect(payload.parties?.addressee?.kind).toBe('person');
    expect(payload.parties?.addressee?.firstName).toBe('Jan');
    expect(payload.parties?.addressee?.lastName).toBe('Kowalski');
    expect(payload.parties?.addressee?.street).toBe('Jasna');
    expect(payload.parties?.addressee?.streetNumber).toBe('12');
    expect(payload.parties?.addressee?.houseNumber).toBe('4');
    expect(payload.parties?.addressee?.postalCode).toBe('00-013');
    expect(payload.parties?.addressee?.city).toBe('Warszawa');
  });

  it('captures mixed Polish sender and recipient labels in rules-only mode', () => {
    const segments: PromptExploderSegment[] = [
      createSegment({
        id: 'polish-labeled',
        raw: [
          'Nadawca:',
          'Michał Matynia',
          'Fioletowa 71/2',
          '70-781 Szczecin',
          'Polska',
          '',
          'Adresat:',
          'Jan Kowalski',
          'ul. Jasna 12/4',
          '00-013 Warszawa',
        ].join('\n'),
      }),
    ];

    const payload = extractCaseResolverBridgePayloadFromSegments(segments, {
      captureRules,
      mode: 'rules_only',
    });

    expect(payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload.parties?.addressee?.displayName).toBe('Jan Kowalski');
    expect(payload.parties?.addressee?.kind).toBe('person');
    expect(payload.parties?.addressee?.firstName).toBe('Jan');
    expect(payload.parties?.addressee?.lastName).toBe('Kowalski');
  });
});
