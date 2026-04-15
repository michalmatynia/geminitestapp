'use client';

import { Download, Upload } from 'lucide-react';
import { useRef } from 'react';

import {
  type PlaywrightAction,
  type PlaywrightFlow,
  type PlaywrightStep,
  type PlaywrightStepSet,
  type PlaywrightWebsite,
  playwrightActionSchema,
  playwrightFlowSchema,
  playwrightStepSchema,
  playwrightStepSetSchema,
  playwrightWebsiteSchema,
} from '@/shared/contracts/playwright-steps';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives.public';
import { useToast } from '@/shared/ui/primitives.public';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportPayload {
  version: 1;
  exportedAt: string;
  steps: PlaywrightStep[];
  stepSets: PlaywrightStepSet[];
  actions: PlaywrightAction[];
  websites: PlaywrightWebsite[];
  flows: PlaywrightFlow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseImport(raw: unknown): ExportPayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (obj['version'] !== 1) return null;

  const steps = Array.isArray(obj['steps'])
    ? (obj['steps'] as unknown[])
        .map((s) => playwrightStepSchema.safeParse(s))
        .filter((r) => r.success)
        .map((r) => r.data!)
    : [];

  const stepSets = Array.isArray(obj['stepSets'])
    ? (obj['stepSets'] as unknown[])
        .map((s) => playwrightStepSetSchema.safeParse(s))
        .filter((r) => r.success)
        .map((r) => r.data!)
    : [];

  const actions = Array.isArray(obj['actions'])
    ? (obj['actions'] as unknown[])
        .map((a) => playwrightActionSchema.safeParse(a))
        .filter((r) => r.success)
        .map((r) => r.data!)
    : [];

  const websites = Array.isArray(obj['websites'])
    ? (obj['websites'] as unknown[])
        .map((w) => playwrightWebsiteSchema.safeParse(w))
        .filter((r) => r.success)
        .map((r) => r.data!)
    : [];

  const flows = Array.isArray(obj['flows'])
    ? (obj['flows'] as unknown[])
        .map((f) => playwrightFlowSchema.safeParse(f))
        .filter((r) => r.success)
        .map((r) => r.data!)
    : [];

  return {
    version: 1,
    exportedAt: typeof obj['exportedAt'] === 'string' ? obj['exportedAt'] : new Date().toISOString(),
    steps,
    stepSets,
    actions,
    websites,
    flows,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportExportMenu(): React.JSX.Element {
  const { toast } = useToast();
  const {
    steps,
    stepSets,
    actions,
    websites,
    flows,
    handleBatchImport,
  } = usePlaywrightStepSequencer();

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport(): void {
    const payload: ExportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      steps,
      stepSets,
      actions,
      websites,
      flows,
    };
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(payload, `playwright-step-sequencer-${date}.json`);
    toast('Configuration exported.', { variant: 'success' });
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      toast('Invalid JSON file.', { variant: 'error' });
      return;
    }

    const payload = parseImport(parsed);
    if (!payload) {
      toast('Unrecognised export format (expected version 1).', { variant: 'error' });
      return;
    }

    const { imported } = await handleBatchImport(payload);

    if (imported === 0) {
      toast('Nothing new to import — all items already exist.', { variant: 'success' });
    } else {
      toast(`Imported ${imported} item${imported !== 1 ? 's' : ''}.`, { variant: 'success' });
    }
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='.json,application/json'
        className='sr-only'
        onChange={(e) => void handleImportFile(e)}
        aria-label='Import configuration file'
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' size='sm' className='h-7 gap-1 text-xs'>
            <Download className='size-3.5' />
            Export / Import
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel className='text-xs'>Configuration</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExport}>
            <Download className='size-3.5' />
            Export JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className='size-3.5' />
            Import JSON (merge)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
