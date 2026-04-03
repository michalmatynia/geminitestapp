import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/features/kangur/ui/components/KangurAiTutorGuidedCallout.tsx');
const TARGET_DIR = path.resolve('src/features/kangur/ui/components/ai-tutor-guided');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// recover original in case the previous script somehow messed it up
import { execSync } from 'child_process';
execSync('git checkout src/features/kangur/ui/components/KangurAiTutorGuidedCallout.tsx');

const content = fs.readFileSync(SRC_FILE, 'utf8');

// I will just pull out the hooks and functions using regex blocks.

// Instead of delicate regex over React components, it's safer to keep it unified, or just move the entire file to a new name and split it.
// The easiest way to split a React file programmatically when you know the function names is just finding `function X` to the next `function Y`.

const lines = content.split('\n');

function extractLinesBetween(startStr: string, endStr: string | null) {
  const startIdx = lines.findIndex(l => l.startsWith(startStr));
  if (startIdx === -1) return [];
  
  if (!endStr) {
    return lines.slice(startIdx);
  }
  
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith(endStr));
  if (endIdx === -1) return lines.slice(startIdx);
  
  return lines.slice(startIdx, endIdx);
}

// Types and imports from top
const importsBlock = lines.slice(0, lines.findIndex(l => l.includes('GUIDED_CALLOUT_ENTRY_OFFSET_PX')));

// State logic
const constants = extractLinesBetween('const GUIDED_CALLOUT_ENTRY_OFFSET_PX', 'function useGuidedCalloutSelectionState');
const state1 = extractLinesBetween('function useGuidedCalloutSelectionState', 'const resolveGuidedSelectionDisplayState');
const state2 = extractLinesBetween('const resolveGuidedSelectionDisplayState', 'const resolveGuidedCalloutLayoutState');
const state3 = extractLinesBetween('const resolveGuidedCalloutLayoutState', 'function useGuidedCalloutSketchState');
const state4 = extractLinesBetween('function useGuidedCalloutSketchState', 'const resolveGuidedCalloutMotionProps');
const state5 = extractLinesBetween('const resolveGuidedCalloutMotionProps', 'function KangurAiTutorGuidedCalloutShell');

// Layout
const shell = extractLinesBetween('function KangurAiTutorGuidedCalloutShell', 'function KangurAiTutorGuidedCalloutHeader');
const header = extractLinesBetween('function KangurAiTutorGuidedCalloutHeader', 'function KangurAiTutorGuidedCalloutStepLabel');
const stepLabel = extractLinesBetween('function KangurAiTutorGuidedCalloutStepLabel', 'function KangurAiTutorGuidedCalloutIntro');
const intro = extractLinesBetween('function KangurAiTutorGuidedCalloutIntro', 'function KangurAiTutorGuidedCalloutSectionCard');
const actions = extractLinesBetween('function KangurAiTutorGuidedCalloutActions', 'function KangurAiTutorGuidedCalloutBody');
const body = extractLinesBetween('function KangurAiTutorGuidedCalloutBody', 'export function KangurAiTutorGuidedCallout');

// Cards
const sectionCard = extractLinesBetween('function KangurAiTutorGuidedCalloutSectionCard', 'function KangurAiTutorGuidedSelectionSourceCard');
const sourceCard = extractLinesBetween('function KangurAiTutorGuidedSelectionSourceCard', 'function KangurAiTutorGuidedSelectionSketchCard');
const sketchCard = extractLinesBetween('function KangurAiTutorGuidedSelectionSketchCard', 'function KangurAiTutorGuidedSelectionHintCard');
const hintCard = extractLinesBetween('function KangurAiTutorGuidedSelectionHintCard', 'function KangurAiTutorGuidedSelectionResolvedContent');
const resolvedContent = extractLinesBetween('function KangurAiTutorGuidedSelectionResolvedContent', 'function KangurAiTutorGuidedCalloutActions');

// Root
const rootComp = extractLinesBetween('export function KangurAiTutorGuidedCallout', null);

const cleanImports = importsBlock.join('\n')
  .replace(/import \{.*?KangurAiTutorGuidedCalloutShell.*?\} from '\.\/KangurAiTutorChrome';/gs, '');

const stateFile = `
${cleanImports}

// --- CONSTANTS ---
${constants.join('\n')}

// --- STATE ---
export ${state1.join('\n')}
export ${state2.join('\n')}
export ${state3.join('\n')}
export ${state4.join('\n')}
export ${state5.join('\n')}
`;

const cardsFile = `
${cleanImports}
import { resolveGuidedSelectionDisplayState, useGuidedCalloutSelectionState, useGuidedCalloutSketchState } from './KangurAiTutorGuided.state';

export ${sectionCard.join('\n')}
export ${sourceCard.join('\n')}
export ${sketchCard.join('\n')}
export ${hintCard.join('\n')}
export ${resolvedContent.join('\n')}
`;

const layoutFile = `
${cleanImports}
import { resolveGuidedSelectionDisplayState, resolveGuidedCalloutLayoutState, useGuidedCalloutSelectionState, useGuidedCalloutSketchState } from './KangurAiTutorGuided.state';
import { KangurAiTutorGuidedCalloutSectionCard, KangurAiTutorGuidedSelectionSourceCard, KangurAiTutorGuidedSelectionResolvedContent } from './KangurAiTutorGuidedCards';

export ${shell.join('\n')}
export ${header.join('\n')}
export ${stepLabel.join('\n')}
export ${intro.join('\n')}
export ${actions.join('\n')}
export ${body.join('\n')}
`;

const rootFile = `
${cleanImports}
import {
  useGuidedCalloutSelectionState,
  resolveGuidedSelectionDisplayState,
  resolveGuidedCalloutLayoutState,
  useGuidedCalloutSketchState,
} from './ai-tutor-guided/KangurAiTutorGuided.state';
import {
  KangurAiTutorGuidedCalloutShell,
  KangurAiTutorGuidedCalloutBody
} from './ai-tutor-guided/KangurAiTutorGuidedLayout';

${rootComp.join('\n')}
`;

fs.writeFileSync(path.join(TARGET_DIR, 'KangurAiTutorGuided.state.ts'), stateFile.replace(/export export/g, 'export').replace(/function/g, 'function').trim());
fs.writeFileSync(path.join(TARGET_DIR, 'KangurAiTutorGuidedCards.tsx'), cardsFile.replace(/export export/g, 'export').trim());
fs.writeFileSync(path.join(TARGET_DIR, 'KangurAiTutorGuidedLayout.tsx'), layoutFile.replace(/export export/g, 'export').trim());
fs.writeFileSync(SRC_FILE, rootFile.replace(/export export/g, 'export').trim());

console.log('Split into components!');
