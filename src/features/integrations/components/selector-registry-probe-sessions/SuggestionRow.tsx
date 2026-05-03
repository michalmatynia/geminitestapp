import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/primitives.public';
import { SelectorRegistryProbeSuggestionBadges } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-badges';
import { SelectorRegistryProbeSuggestionCandidateDetails } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-candidates';
import {
  getSelectorRegistryProbeSuggestionEvidenceText,
  getSelectorRegistryProbeSuggestionPrimaryPageLabel,
  getSelectorRegistryProbeSuggestionSecondaryPageLabel,
  getSelectorRegistryProbeSuggestionTextPreview,
} from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-formatting';
import type { SelectorRegistryProbeSession } from '@/shared/contracts/integrations/selector-registry';

type SuggestionRowProps = {
  suggestion: SelectorRegistryProbeSession['suggestions'][number];
  suggestionKey: string;
  selectedKey: string;
  matchingEntries: { key: string }[];
  inheritedFromTemplate: boolean;
  carryForwardSource?: { selectedKey: string };
  isCarryForwardSource: boolean;
  isReadOnly: boolean;
  onSelect: (value: string) => void;
  onPromote: () => Promise<void>;
  isPromoting: boolean;
};

export function SuggestionRow({
  suggestion,
  suggestionKey,
  selectedKey,
  matchingEntries,
  inheritedFromTemplate,
  carryForwardSource,
  isCarryForwardSource,
  isReadOnly,
  onSelect,
  onPromote,
  isPromoting,
}: SuggestionRowProps) {
  return (
    <div className='grid gap-3 rounded-md border border-border/60 bg-muted/10 p-3 lg:grid-cols-[minmax(0,1fr)_300px]'>
      <div className='space-y-2'>
        <SelectorRegistryProbeSuggestionBadges
          role={suggestion.classificationRole}
          confidence={suggestion.confidence}
          tag={suggestion.tag}
          draftTargetHints={suggestion.draftTargetHints}
          baseKey={suggestionKey}
          isCarryForwardSource={isCarryForwardSource}
        />
        <div className='text-sm font-medium'>
          {getSelectorRegistryProbeSuggestionTextPreview(suggestion)}
        </div>
        <div className='text-xs text-muted-foreground'>
          {getSelectorRegistryProbeSuggestionEvidenceText(suggestion)}
        </div>
        <div className='space-y-1 text-xs text-muted-foreground'>
          <div>{getSelectorRegistryProbeSuggestionPrimaryPageLabel(suggestion)}</div>
          {getSelectorRegistryProbeSuggestionSecondaryPageLabel(suggestion) ? (
            <div>{getSelectorRegistryProbeSuggestionSecondaryPageLabel(suggestion)}</div>
          ) : null}
          <SelectorRegistryProbeSuggestionCandidateDetails suggestion={suggestion} />
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor={`stored-probe-key-${suggestionKey}`}>Promote As</Label>
        <Select value={selectedKey} onValueChange={onSelect}>
          <SelectTrigger id={`stored-probe-key-${suggestionKey}`}>
            <SelectValue placeholder={matchingEntries.length === 0 ? 'No matching keys' : 'Choose a key'} />
          </SelectTrigger>
          <SelectContent>
            {matchingEntries.map((entry) => (
              <SelectItem key={entry.key} value={entry.key}>
                {entry.key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {inheritedFromTemplate && carryForwardSource ? (
          <div className='text-xs text-muted-foreground'>
            Inherited from template: {carryForwardSource.selectedKey}
          </div>
        ) : null}

        <Button
          type='button'
          size='sm'
          disabled={isReadOnly || selectedKey.trim().length === 0 || isPromoting}
          loading={isPromoting}
          onClick={onPromote}
        >
          Promote To Registry
        </Button>
        {isReadOnly && (
          <div className='text-xs text-muted-foreground'>Namespace is read-only.</div>
        )}
      </div>
    </div>
  );
}
