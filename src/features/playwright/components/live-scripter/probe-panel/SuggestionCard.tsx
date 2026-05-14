import type { SelectorRegistryNamespace, SelectorRegistryRole } from '@/shared/contracts/integrations/selector-registry';
import { SelectorRegistryProbeSuggestionBadges } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-badges';
import {
  getSelectorRegistryProbeSuggestionEvidenceText,
  getSelectorRegistryProbeSuggestionTextPreview,
} from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-formatting';
import { SelectorRegistryProbeSuggestionCandidateDetails } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-candidates';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@/shared/ui/primitives.public';
import { applySelectorRegistryProbeCarryForwardManualSelection } from '@/shared/lib/browser-execution/selector-registry-probe-carry-forward';

export interface ProbeSuggestion {
  suggestionId: string;
  tag: string;
  id: string;
  classes: string[];
  textPreview: string;
  role: SelectorRegistryRole;
  attrs: Record<string, string>;
  candidates: { css?: string; xpath?: string };
  pageUrl: string;
  confidence: number;
  draftTargetHints: any;
  classificationRole: SelectorRegistryRole;
}

export const SuggestionCard = ({
  suggestion,
  registryNamespace,
  registryProfile,
  effectiveRole,
  selectedKey,
  aiRole,
  isCarryForwardSource,
  selectedKeys,
  manuallySelectedKeys,
  setManuallySelectedKeys,
  setSelectedKeys,
  matchingEntries,
  carryForwardItems,
  saveMutation,
}: {
  suggestion: ProbeSuggestion;
  registryNamespace: SelectorRegistryNamespace;
  registryProfile: string;
  effectiveRole: SelectorRegistryRole;
  selectedKey: string;
  aiRole: SelectorRegistryRole | undefined;
  isCarryForwardSource: boolean;
  selectedKeys: Record<string, string>;
  manuallySelectedKeys: Record<string, boolean>;
  setManuallySelectedKeys: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  matchingEntries: { key: string }[];
  carryForwardItems: any[];
  saveMutation: any;
}): React.JSX.Element => {
  const { toast } = useToast();
  const selectorValue = suggestion.candidates.css ?? suggestion.candidates.xpath ?? null;

  return (
    <div className='min-w-0 space-y-3 rounded-md border border-white/10 bg-black/20 p-4'>
      <SelectorRegistryProbeSuggestionBadges
        role={effectiveRole}
        confidence={suggestion.confidence}
        tag={suggestion.tag}
        draftTargetHints={suggestion.draftTargetHints}
        baseKey={suggestion.suggestionId}
        isCarryForwardSource={isCarryForwardSource}
        isAiClassified={aiRole !== undefined}
      />
      <div className='space-y-1 text-sm'>
        <div className='font-medium'>{getSelectorRegistryProbeSuggestionTextPreview(suggestion as any)}</div>
        <div className='text-xs text-muted-foreground'>{getSelectorRegistryProbeSuggestionEvidenceText(suggestion as any)}</div>
        <div className='text-xs text-muted-foreground'>{suggestion.pageUrl}</div>
      </div>
      <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]'>
        <SelectorRegistryProbeSuggestionCandidateDetails
          suggestion={suggestion as any}
          mode='stacked'
          includeSiblingRepeat
          className='space-y-2 text-xs text-muted-foreground'
        />
        <div className='space-y-2'>
          <Label htmlFor={`probe-key-${suggestion.suggestionId}`}>Promote As</Label>
          <Select
            value={selectedKey}
            onValueChange={(value) => {
              const nextState = applySelectorRegistryProbeCarryForwardManualSelection({
                items: carryForwardItems,
                selectedKeys,
                manuallySelectedKeys,
                itemId: suggestion.suggestionId,
                selectedKey: value,
              });
              setManuallySelectedKeys(nextState.manuallySelectedKeys);
              setSelectedKeys(nextState.selectedKeys);
            }}
          >
            <SelectTrigger id={`probe-key-${suggestion.suggestionId}`}>
              <SelectValue placeholder='Choose a selector key' />
            </SelectTrigger>
            <SelectContent>
              {matchingEntries.map((entry) => (
                <SelectItem key={entry.key} value={entry.key}>{entry.key}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type='button'
            size='sm'
            disabled={
              registryNamespace === 'vinted' ||
              selectorValue === null ||
              selectedKey.trim().length === 0 ||
              saveMutation.isPending
            }
            onClick={async () => {
              if (selectorValue === null || selectedKey.trim().length === 0) return;
              try {
                const response = await saveMutation.mutateAsync({
                  namespace: registryNamespace,
                  profile: registryProfile,
                  key: selectedKey,
                  valueJson: JSON.stringify(selectorValue),
                  role: effectiveRole,
                });
                toast(response.message, { variant: 'success' });
              } catch (error) {
                toast(error instanceof Error ? error.message : 'Error.', { variant: 'error' });
              }
            }}
          >
            Promote To Registry
          </Button>
        </div>
      </div>
    </div>
  );
};
