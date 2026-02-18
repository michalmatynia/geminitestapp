import { describe, expect, it } from 'vitest';

import { extractCaseResolverBridgePayloadFromSegments } from '@/features/prompt-exploder/utils/case-resolver-extraction';

import type { PromptExploderSegment } from '@/features/prompt-exploder/types';

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
  confidence: 0.9,
});

describe('case resolver extraction bridge payload', () => {
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

    const payload = extractCaseResolverBridgePayloadFromSegments(segments);

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

  it('falls back to line heuristics when pattern ids are unavailable', () => {
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

    const payload = extractCaseResolverBridgePayloadFromSegments(segments);

    expect(payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload.parties?.addressee?.displayName).toBe('Inspektorat ZUS w Gryficach');
    expect(payload.metadata?.placeDate?.city).toBe('Szczecin');
    expect(payload.metadata?.placeDate?.day).toBe('25');
    expect(payload.metadata?.placeDate?.month).toBe('01');
    expect(payload.metadata?.placeDate?.year).toBe('2026');
  });
});
