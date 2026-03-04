import { describe, expect, it } from 'vitest';

import { PROMPT_EXPLODER_PATTERN_PACK } from '@/features/prompt-exploder/pattern-pack-rules';
import {
  buildCaseResolverSegmentCaptureRules,
  resolveCaseResolverBridgePayloadForTransfer,
} from '@/features/prompt-exploder/utils/case-resolver-extraction';
import type { PromptExploderSegment } from '@/shared/contracts/prompt-exploder';

const createSegment = (id: string, raw: string): PromptExploderSegment => ({
  id,
  type: 'assigned_text',
  title: '',
  includeInOutput: true,
  text: raw,
  raw,
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
  matchedPatternIds: [],
  matchedPatternLabels: [],
  matchedSequenceLabels: [],
  confidence: 1,
  validationResults: [],
  segments: [],
});

describe('case resolver return parties payload', () => {
  const captureRules = buildCaseResolverSegmentCaptureRules(
    PROMPT_EXPLODER_PATTERN_PACK,
    'case_resolver_prompt_exploder'
  );

  it('returns sender and recipient proposals for combined labeled content in strict rules-only mode', () => {
    const result = resolveCaseResolverBridgePayloadForTransfer({
      segments: [
        createSegment(
          'combined',
          [
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
          ].join('\n')
        ),
      ],
      captureRules,
      mode: 'rules_only',
    });

    expect(result.requestedMode).toBe('rules_only');
    expect(result.effectiveMode).toBe('rules_only');
    expect(result.hasCaptureData).toBe(true);
    expect(result.payload.parties?.addresser?.displayName).toBe('Michał Matynia');
    expect(result.payload.parties?.addressee?.displayName).toBe(
      'Komisariat Policji Szczecin–Dąbie'
    );
  });

  it('returns recipient person proposals for inline To labels in strict rules-only mode', () => {
    const result = resolveCaseResolverBridgePayloadForTransfer({
      segments: [
        createSegment(
          'inline',
          [
            'From: Michał Matynia',
            'Fioletowa 71/2',
            '70-781 Szczecin',
            'Polska',
            '',
            'To: Jan Kowalski',
            'ul. Jasna 12/4',
            '00-013 Warszawa',
          ].join('\n')
        ),
      ],
      captureRules,
      mode: 'rules_only',
    });

    expect(result.hasCaptureData).toBe(true);
    expect(result.payload.parties?.addressee?.displayName).toBe('Jan Kowalski');
    expect(result.payload.parties?.addressee?.kind).toBe('person');
    expect(result.payload.parties?.addressee?.firstName).toBe('Jan');
    expect(result.payload.parties?.addressee?.lastName).toBe('Kowalski');
  });
});
