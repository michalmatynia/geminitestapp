import { CopyIcon } from 'lucide-react';

import { Button, Label, Textarea, Checkbox, Badge, UnifiedSelect, SectionPanel } from '@/shared/ui';


interface PromptGenerationSectionProps {
  pathNumber: number;
  pathTitle: string;
  inputLabel: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  initialResultLabel: string;
  initialResultValue: string | null;
  onCopyInitialResult: () => void;
  modelLabel: string;
  modelValue: string;
  onModelChange: (value: string) => void;
  modelOptions: Array<{ value: string; label: string; description: string }>;
  outputEnabled: boolean;
  onOutputEnabledChange: (enabled: boolean) => void;
  outputPromptLabel: string;
  outputPromptValue: string;
  onOutputPromptChange: (value: string) => void;
  outputPlaceholder: string;
  finalResultLabel: string;
  finalResultValue: string | null;
  onCopyFinalResult: () => void;
  badgeVariant: 'info' | 'secondary';
  badgeTextColor: string;
  outputEnabledCheckboxId: string;
}

export function PromptGenerationSection({
  pathNumber,
  pathTitle,
  inputLabel,
  inputValue,
  onInputChange,
  initialResultLabel,
  initialResultValue,
  onCopyInitialResult,
  modelLabel,
  modelValue,
  onModelChange,
  modelOptions,
  outputEnabled,
  onOutputEnabledChange,
  outputPromptLabel,
  outputPromptValue,
  onOutputPromptChange,
  outputPlaceholder,
  finalResultLabel,
  finalResultValue,
  onCopyFinalResult,
  badgeVariant,
  badgeTextColor,
  outputEnabledCheckboxId,
}: PromptGenerationSectionProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant={badgeVariant} className={`h-6 w-6 justify-center p-0 font-bold ${badgeTextColor}`}>{pathNumber}</Badge>
        <h3 className="text-md font-medium text-white">{pathTitle}</h3>
      </div>
      
      <div className="pl-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>{inputLabel}</Label>
            <Textarea
              rows={pathNumber === 1 ? 4 : 6} // Path 1 is 4 rows, Path 2 is 6 rows
              value={inputValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onInputChange(e.target.value)}
              className="mt-1.5 bg-gray-900 border text-white font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{initialResultLabel}</Label>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={onCopyInitialResult}>
                <CopyIcon className="size-3 mr-1"/>Copy
              </Button>
            </div>
            <SectionPanel variant="subtle" className={`mt-1.5 p-4 text-sm text-gray-300 h-[${pathNumber === 1 ? '100px' : '132px'}] overflow-y-auto border border-border font-${pathNumber === 1 ? 'mono' : 'sans'}`}>
              {initialResultValue ? (
                <div className="whitespace-pre-wrap">{initialResultValue}</div>
              ) : (
                <span className="text-gray-600 italic text-xs">No result yet.</span>
              )}
            </SectionPanel>
          </div>
        </div>

        <div className="max-w-md">
          <Label>{modelLabel}</Label>
          <UnifiedSelect
            value={modelValue}
            onValueChange={onModelChange}
            options={modelOptions}
          />
        </div>

        <div className="pt-4 border-t border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              id={outputEnabledCheckboxId} 
              checked={outputEnabled} 
              onCheckedChange={(checked: boolean | 'indeterminate') => onOutputEnabledChange(!!checked)} 
            />
            <Label htmlFor={outputEnabledCheckboxId} className={`cursor-pointer ${badgeTextColor}`}>Enable Output Prompt (Refinement using {modelValue})</Label>
          </div>
          {outputEnabled && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label>{outputPromptLabel}</Label>
                <Textarea
                  rows={pathNumber === 1 ? 4 : 6} // Path 1 is 4 rows, Path 2 is 6 rows
                  value={outputPromptValue}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onOutputPromptChange(e.target.value)}
                  className="mt-1.5 bg-gray-900 border text-white font-mono text-sm"
                  placeholder={outputPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{finalResultLabel}</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={onCopyFinalResult}>
                    <CopyIcon className="size-3 mr-1"/>Copy
                  </Button>
                </div>
                <SectionPanel variant="subtle" className={`mt-1.5 p-4 text-sm text-gray-300 h-[${pathNumber === 1 ? '100px' : '132px'}] overflow-y-auto border border-border font-${pathNumber === 1 ? 'mono' : 'sans'}`}>
                  {finalResultValue ? (
                    <div className="whitespace-pre-wrap">{finalResultValue}</div>
                  ) : (
                    <span className="text-gray-600 italic text-xs">No result yet.</span>
                  )}
                </SectionPanel>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
