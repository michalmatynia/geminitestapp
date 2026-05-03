/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SLIDES as aiDocumentationSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54AiDocumentationLesson.data';
import { SLIDES as approvalsSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54ApprovalsLesson.data';
import { SLIDES as cliIdeSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54CliIdeLesson.data';
import { SLIDES as configLayerSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54ConfigLayersLesson.data';
import { SLIDES as delegationSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54DelegationLesson.data';
import { SLIDES as fitSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54FitLesson.data';
import { SLIDES as mcpSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54McpIntegrationsLesson.data';
import { SLIDES as modelsSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54ModelsLesson.data';
import { SLIDES as responseContractSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54ResponseContractLesson.data';
import { SLIDES as reviewSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54ReviewLesson.data';
import { SLIDES as safetySlides } from '@/features/kangur/ui/components/AgenticCodingCodex54SafetyLesson.data';
import { SLIDES as stateScaleSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54StateScaleLesson.data';
import { SLIDES as surfacesSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54SurfacesLesson.data';
import { SLIDES as toolingSlides } from '@/features/kangur/ui/components/AgenticCodingCodex54ToolingLesson.data';

describe('AgenticCodingCodex54 lesson panels', () => {
  it('keeps AI documentation guidance inside the visual support area', () => {
    render(<>{aiDocumentationSlides.ai_documentation[1]?.content}</>);

    const supportingItem = screen.getByText('Zaczynaj od celu, żeby zablokować scope creep.');

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-callout')).toBeNull();
  });

  it('keeps review proof-loop guidance inside the visual support area', () => {
    render(<>{reviewSlides.review[0]?.content}</>);

    const supportingItem = screen.getByText('Testy dodane lub zaktualizowane.');

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-callout')).toBeNull();
  });

  it('keeps model trade-off guidance inside the visual support area', () => {
    render(<>{modelsSlides.models[0]?.content}</>);

    const supportingItem = screen.getByText('Szybkie iteracje, krótkie zadania, mały scope.');

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-inset')).toBeNull();
  });

  it('keeps CLI and IDE supporting notes inside the visual support area', () => {
    render(<>{cliIdeSlides.cli_ide[0]?.content}</>);

    const supportingItem = screen.getByText('Kontekst z otwartych plików = krótsze prompty.');

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-callout')).toBeNull();
  });

  it('keeps state-and-scale notes inside the visual support area', () => {
    render(<>{stateScaleSlides['state-scale'][0]?.content}</>);

    const supportingItem = screen.getByText(
      'Stan rozmowy jest wbudowany, bez ręcznego kopiowania.'
    );

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-inset')).toBeNull();
  });

  it('keeps config-layer notes inside the visual support area', () => {
    render(<>{configLayerSlides['config-layers'][0]?.content}</>);

    const supportingItem = screen.getByText('`.codex/config.toml` dla projektu.');

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-inset')).toBeNull();
  });

  it('keeps delegation guidance inside the visual support area', () => {
    render(<>{delegationSlides.delegation[0]?.content}</>);

    const supportingItem = screen.getByText(
      'Deleguj tylko wtedy, gdy użytkownik explicitnie tego chce.'
    );

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-callout')).toBeNull();
  });

  it('keeps tooling map notes inside the visual support area', () => {
    render(<>{toolingSlides.tooling[0]?.content}</>);

    const supportingItem = screen.getByText('Aktualne informacje z sieci + cytaty.');

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-inset')).toBeNull();
  });

  it('keeps surface descriptions inside the visual support area', () => {
    render(<>{surfacesSlides.surfaces[0]?.content}</>);

    const supportingItem = screen.getByText(
      'App: wątki równolegle, worktrees, automations. Cloud: zadania w tle.'
    );

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-inset')).toBeNull();
  });

  it('keeps fit examples inside the visual support area', () => {
    render(<>{fitSlides.fit[0]?.content}</>);

    const supportingItem = screen.getByText(
      'Powtarzalne workflow: importy, raporty, automatyzacje.'
    );

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-callout')).toBeNull();
  });

  it('keeps MCP role notes inside the visual support area', () => {
    render(<>{mcpSlides['mcp-integrations'][1]?.content}</>);

    const supportingItem = screen.getByText(
      'Najczęstsze integracje: Figma, GitHub, wewnętrzne bazy wiedzy.'
    );

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-callout')).toBeNull();
  });

  it('keeps approvals defaults inside the visual support area', () => {
    render(<>{approvalsSlides.approvals[0]?.content}</>);

    const supportingItem = screen.getByText(
      'Approval policy decyduje, kiedy agent pyta o zgodę.'
    );

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-callout')).toBeNull();
  });

  it('keeps safety principles inside the visual support area', () => {
    render(<>{safetySlides.safety[0]?.content}</>);

    const supportingItem = screen.getByText(
      'Minimalny dostęp + maksymalny ślad audytowy.'
    );

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-callout')).toBeNull();
  });

  it('keeps response-contract rules inside the visual support area', () => {
    render(<>{responseContractSlides.response_contract[0]?.content}</>);

    const supportingItem = screen.getByText(
      'Jeśli użytkownik pyta o output komendy, podaj kluczowe linie.'
    );

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-callout')).toBeNull();
  });
});
