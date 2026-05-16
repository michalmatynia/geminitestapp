'use client';

import React from 'react';
import type {
  SelectorRegistryProbeSession,
} from '@/shared/contracts/integrations/selector-registry';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { SelectorRegistryProbeSuggestionBadges } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-badges';
import {
  getSelectorRegistryProbeSuggestionEvidenceText,
  getSelectorRegistryProbeSuggestionPrimaryPageLabel,
  getSelectorRegistryProbeSuggestionTextPreview,
  type SelectorRegistryProbeSuggestionFormattingInput,
} from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-formatting';
import { SelectorRegistryProbeSuggestionCandidateDetails } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-candidates';

export type ArchivedSessionCardProps = {
  session: SelectorRegistryProbeSession;
  isPending: boolean;
  onRestoreSession: (id: string) => Promise<void>;
  onRejectSession: (id: string) => Promise<void>;
  onPromoteAndArchiveSession: (id: string) => Promise<void>;
};

const formatTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

function ArchivedSessionActions(props: {
  sessionId: string;
  isPending: boolean;
  onRestoreSession: (id: string) => Promise<void>;
  onRejectSession: (id: string) => Promise<void>;
  onPromoteAndArchiveSession: (id: string) => Promise<void>;
}): React.JSX.Element {
  const { sessionId, isPending, onRestoreSession, onRejectSession, onPromoteAndArchiveSession } = props;
  return (
    <div className='flex flex-wrap gap-2'>
      <Button type='button' size='sm' variant='outline' disabled={isPending} onClick={() => { void onRestoreSession(sessionId); }}>
        Restore Session
      </Button>
      <Button type='button' size='sm' variant='outline' disabled={isPending} onClick={() => { void onRejectSession(sessionId); }}>
        Reject Session
      </Button>
      <Button type='button' size='sm' variant='outline' disabled={isPending} onClick={() => { void onPromoteAndArchiveSession(sessionId); }}>
        Promote And Archive Session
      </Button>
    </div>
  );
}

export function ArchivedSessionCard(props: ArchivedSessionCardProps): React.JSX.Element {
  const { session, isPending, onRestoreSession, onRejectSession, onPromoteAndArchiveSession } = props;

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-muted/10 p-4'>
      <div className='space-y-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline'>{session.profile}</Badge>
          <Badge variant='outline'>{session.scannedPages} pages</Badge>
          <Badge variant='outline'>{session.suggestionCount} suggestions</Badge>
          <Badge variant='secondary'>
            Archived {formatTimestamp(session.archivedAt ?? session.updatedAt)}
          </Badge>
        </div>
        <div className='text-sm font-medium'>{session.sourceTitle ?? session.sourceUrl}</div>
        <div className='text-xs text-muted-foreground'>{session.sourceUrl}</div>
      </div>
      <ArchivedSessionActions
        sessionId={session.id}
        isPending={isPending}
        onRestoreSession={onRestoreSession}
        onRejectSession={onRejectSession}
        onPromoteAndArchiveSession={onPromoteAndArchiveSession}
      />
      <div className='space-y-3'>
        {session.suggestions.map((suggestion: SelectorRegistryProbeSession['suggestions'][number]) => {
          const formattingInput: SelectorRegistryProbeSuggestionFormattingInput = {
            textPreview: suggestion.textPreview,
            pageTitle: session.sourceTitle,
            pageUrl: session.sourceUrl,
            evidence: suggestion.evidence,
            candidates: suggestion.candidates,
          };
          return (
            <div key={`archived:${session.id}:${suggestion.suggestionId}`} className='space-y-2 rounded-md border border-border/60 bg-background/40 p-3'>
              <SelectorRegistryProbeSuggestionBadges
                role={suggestion.classificationRole}
                confidence={suggestion.confidence}
                tag={suggestion.tag}
                draftTargetHints={suggestion.draftTargetHints}
                baseKey={`archived:${session.id}:${suggestion.suggestionId}`}
              />
              <div className='text-sm font-medium'>{getSelectorRegistryProbeSuggestionTextPreview(formattingInput)}</div>
              <div className='text-xs text-muted-foreground'>{getSelectorRegistryProbeSuggestionEvidenceText(formattingInput)}</div>
              <div className='space-y-1 text-xs text-muted-foreground'>
                <div>{getSelectorRegistryProbeSuggestionPrimaryPageLabel(formattingInput)}</div>
                <SelectorRegistryProbeSuggestionCandidateDetails suggestion={suggestion} />
                <div>Archived probe suggestion. Review history only until restored.</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
