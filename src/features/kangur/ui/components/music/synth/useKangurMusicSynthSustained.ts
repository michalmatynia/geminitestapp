'use client';

import { useCallback, useRef } from 'react';
import { releaseActiveNode, resolveConfiguredReleaseSeconds, resolveSustainedReleaseSeconds, stopActiveNode } from '../useKangurMusicSynth.utils';
import type { StopSustainedNoteOptions, SustainedNode } from '../useKangurMusicSynth.types';

export function useKangurMusicSynthSustained<NoteId extends string>() {
  const sustainedNodesRef = useRef<Map<string, SustainedNode<NoteId>>>(new Map());

  const stopSustainedNote = useCallback(
    (interactionId: string, options: StopSustainedNoteOptions = {}): void => {
      const activeNode = sustainedNodesRef.current.get(interactionId);
      if (!activeNode) {
        return;
      }

      sustainedNodesRef.current.delete(interactionId);
      if (options.immediate) {
        stopActiveNode(activeNode);
        return;
      }

      const resolvedReleaseSeconds =
        options.releaseSeconds ??
        (activeNode.envelope
          ? resolveConfiguredReleaseSeconds(activeNode.envelope.releaseMs)
          : resolveSustainedReleaseSeconds(
              options.brightness ?? activeNode.brightness,
              options.velocity ?? activeNode.velocity,
              activeNode.currentFrequencyHz
            ));
      releaseActiveNode(activeNode, resolvedReleaseSeconds);
    },
    []
  );

  const stopAllSustainedNotes = useCallback(
    (options: StopSustainedNoteOptions = {}): void => {
      const interactionIds = [...sustainedNodesRef.current.keys()];
      interactionIds.forEach((interactionId) => {
        stopSustainedNote(interactionId, options);
      });
    },
    [stopSustainedNote]
  );

  return {
    sustainedNodesRef,
    stopSustainedNote,
    stopAllSustainedNotes,
  };
}
