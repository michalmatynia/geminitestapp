import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const kangurStylesheetPath = path.join(process.cwd(), 'src/app/(frontend)/kangur/kangur.css');
const kangurButtonPath = path.join(
  process.cwd(),
  'src/features/kangur/ui/design/primitives/KangurButton.tsx'
);
const kangurAiTutorWidgetDisplayPath = path.join(
  process.cwd(),
  'src/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget.coordinator-display.ts'
);
const kangurAiTutorPanelChromePath = path.join(
  process.cwd(),
  'src/features/kangur/ui/components/KangurAiTutorPanelChrome.tsx'
);
const kangurAiTutorPanelChromeSharedPath = path.join(
  process.cwd(),
  'src/features/kangur/ui/components/KangurAiTutorPanelChrome.shared.ts'
);
const kangurAiTutorPanelChromeSurfacePath = path.join(
  process.cwd(),
  'src/features/kangur/ui/components/KangurAiTutorPanelChrome.surface.tsx'
);
const kangurAiTutorPanelAuxiliaryControlsPath = path.join(
  process.cwd(),
  'src/features/kangur/ui/components/KangurAiTutorPanelAuxiliaryControls.tsx'
);
const kangurAiTutorMessageListPath = path.join(
  process.cwd(),
  'src/features/kangur/ui/components/KangurAiTutorMessageList.tsx'
);
const kangurAiTutorComposerPath = path.join(
  process.cwd(),
  'src/features/kangur/ui/components/KangurAiTutorComposer.tsx'
);
const kangurParentDashboardAiTutorWidgetPath = path.join(
  process.cwd(),
  'src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.tsx'
);
const kangurHomeActionsWidgetPath = path.join(
  process.cwd(),
  'src/features/kangur/ui/components/game-home/KangurGameHomeActionsWidget.tsx'
);
const kangurSourceRoots = [
  path.join(process.cwd(), 'src/features/kangur'),
  path.join(process.cwd(), '__tests__/features/kangur'),
];

type SourceEntry = {
  filePath: string;
  source: string;
};

const readSources = (paths: string[]): string =>
  paths.map((filePath) => readFileSync(filePath, 'utf8')).join('\n');

const collectSourceEntries = (directory: string): SourceEntry[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceEntries(entryPath);
    }

    if (!/\.(ts|tsx|css)$/.test(entry.name)) {
      return [];
    }

    if (entryPath.endsWith('cta-contract-cleanup.test.ts')) {
      return [];
    }

    return [
      {
        filePath: entryPath,
        source: readFileSync(entryPath, 'utf8'),
      },
    ];
  });

const findSourceMatches = (pattern: string): string[] =>
  kangurSourceRoots
    .flatMap((root) => collectSourceEntries(root))
    .filter((entry) => entry.source.includes(pattern))
    .map((entry) => path.relative(process.cwd(), entry.filePath));

describe('Kangur CTA contract cleanup', () => {
  it('keeps a single primary-cta class without the removed play-cta alias', () => {
    const source = readFileSync(kangurStylesheetPath, 'utf8');

    expect(source).toContain('.primary-cta');
    expect(source).not.toContain('.play-cta');
  });

  it('keeps a single primary button variant without the removed warm alias', () => {
    const source = readFileSync(kangurButtonPath, 'utf8');

    expect(source).toContain('primary:');
    expect(source).not.toContain('warm:');
  });

  it('keeps the ai tutor launcher on the warm orange chrome instead of the old purple tint', () => {
    const source = readSources([kangurAiTutorWidgetDisplayPath, kangurStylesheetPath]);

    expect(source).toContain('kangur-chat-floating-avatar');
    expect(source).toContain(
      'linear-gradient(135deg, #fcd34d 0%, #fb923c 55%, #f97316 100%)'
    );
    expect(source).toContain('border-color: var(--kangur-chat-floating-avatar-border, #78350f)');
    expect(source).toContain(
      'focus-visible:[--tw-ring-color:var(--kangur-chat-floating-avatar-focus-ring,rgba(251,191,36,0.7))]'
    );
    expect(source).not.toContain('from-indigo-500 via-fuchsia-500 to-amber-400');
    expect(source).not.toContain('focus-visible:ring-indigo-400');
  });

  it('keeps the ai tutor runtime wrappers on the warm amber/orange palette', () => {
    const source = readSources([
      kangurAiTutorPanelChromePath,
      kangurAiTutorPanelChromeSharedPath,
      kangurAiTutorPanelChromeSurfacePath,
      kangurAiTutorPanelAuxiliaryControlsPath,
      kangurAiTutorMessageListPath,
      kangurAiTutorComposerPath,
    ]);

    expect(source).toContain('relative flex flex-col overflow-hidden border kangur-chat-panel-surface');
    expect(source).toContain('kangur-chat-header-surface');
    expect(source).toContain('--kangur-chat-chip-background');
    expect(source).toContain('--kangur-chat-control-background');
    expect(source).toContain('accent=\'amber\'');
    expect(source).not.toContain('bg-[linear-gradient(135deg,#2f4df6_0%,#e84694_55%,#fbbf24_100%)]');
    expect(source).not.toContain('border border-indigo-500 bg-indigo-500');
  });

  it('keeps the parent dashboard ai tutor settings surface on the warm amber palette', () => {
    const source = readFileSync(kangurParentDashboardAiTutorWidgetPath, 'utf8');

    expect(source).toContain('accent=\'amber\'');
    expect(source).toContain('bg-gradient-to-r kangur-gradient-accent-amber');
    expect(source).toContain('border border-amber-100 bg-amber-50/75');
    expect(source).toContain('text-orange-500');
    expect(source).not.toContain('accent=\'indigo\'');
    expect(source).not.toContain('bg-indigo-500');
    expect(source).not.toContain('text-indigo-500');
  });

  it('keeps Kangur home action cards on the amber focus ring', () => {
    const source = readFileSync(kangurHomeActionsWidgetPath, 'utf8');

    expect(source).toContain('focus-visible:ring-amber-300/70');
    expect(source).not.toContain('focus-visible:ring-indigo-300/70');
  });

  it('does not reintroduce the removed warm variant or recommendation helper across Kangur sources', () => {
    expect(findSourceMatches('variant=\'warm\'')).toEqual([]);
    expect(findSourceMatches('variant="warm"')).toEqual([]);
    expect(findSourceMatches('getKangurRecommendationButtonVariant')).toEqual([]);
    expect(findSourceMatches('play-cta')).toEqual([]);
  });
});
