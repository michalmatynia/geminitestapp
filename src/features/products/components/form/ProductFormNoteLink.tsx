"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2, Plus, X } from "lucide-react";
import Link from "next/link";

import { Button, Input, FormSection } from "@/shared/ui";
import { useProductFormContext } from "@/features/products/context/ProductFormContext";
import type { NoteWithRelations, RelatedNote } from "@/shared/types/notes";

type NotesLookupResult = RelatedNote[];

function useNotesSearch(query: string): { notes: NoteWithRelations[]; loading: boolean } {
  const q = query.trim();
  const res = useQuery<NoteWithRelations[]>({
    queryKey: ["notes-search", q],
    queryFn: async (): Promise<NoteWithRelations[]> => {
      const url = `/api/notes?truncateContent=true&searchScope=title&search=${encodeURIComponent(q)}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Failed to search notes");
      return (await r.json()) as NoteWithRelations[];
    },
    enabled: q.length >= 2,
  });

  return { notes: res.data ?? [], loading: res.isLoading };
}

function useNotesLookup(noteIds: string[]): { notes: NotesLookupResult; loading: boolean } {
  const ids = noteIds.filter(Boolean);
  const res = useQuery<NotesLookupResult>({
    queryKey: ["notes-lookup", ids.join(",")],
    queryFn: async (): Promise<NotesLookupResult> => {
      const url = `/api/notes/lookup?ids=${encodeURIComponent(ids.join(","))}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Failed to load linked notes");
      return (await r.json()) as NotesLookupResult;
    },
    enabled: ids.length > 0,
  });

  return { notes: res.data ?? [], loading: res.isLoading };
}

export default function ProductFormNoteLink(): React.JSX.Element {
  const { selectedNoteIds, toggleNote, removeNote } = useProductFormContext();
  const [query, setQuery] = useState("");

  const { notes: searchResults, loading: searching } = useNotesSearch(query);
  const { notes: linkedNotes, loading: loadingLinked } = useNotesLookup(selectedNoteIds);

  const linkedMap = useMemo(() => {
    const map = new Map<string, RelatedNote>();
    linkedNotes.forEach((n: RelatedNote) => map.set(n.id, n));
    return map;
  }, [linkedNotes]);

  const orderedLinked = useMemo(() => {
    return selectedNoteIds
      .map((id: string) => linkedMap.get(id) ?? null)
      .filter((n: RelatedNote | null): n is RelatedNote => n !== null);
  }, [linkedMap, selectedNoteIds]);

  return (
    <div className="space-y-6">
      <FormSection title="Search & Attach" description="Find notes by title to link them with this product.">
        <div className="flex gap-2">
          <Input
            id="note-link-search"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Type at least 2 characters..."
            className="max-w-md h-9"
          />
          {query.trim() && (
            <Button type="button" variant="outline" size="icon" onClick={() => setQuery("")} title="Clear search" className="h-9 w-9">
              <X className="size-4" />
            </Button>
          )}
        </div>

        <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {query.trim().length < 2 ? (
            <div className="text-xs text-muted-foreground italic">Start typing to search notes...</div>
          ) : searching ? (
            <div className="text-xs text-muted-foreground animate-pulse">Searching...</div>
          ) : searchResults.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No notes found.</div>
          ) : (
            searchResults.slice(0, 10).map((note: NoteWithRelations) => {
              const isLinked = selectedNoteIds.includes(note.id);
              return (
                <div
                  key={note.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-gray-900/50 px-3 py-2 transition-colors hover:border-border/80"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-100">{note.title}</div>
                    <div className="truncate text-[10px] text-gray-500 font-mono">{note.id}</div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => toggleNote(note.id)}
                    disabled={isLinked}
                    variant={isLinked ? "ghost" : "secondary"}
                    size="sm"
                    className="h-7 px-2 text-[11px] gap-1"
                  >
                    {isLinked ? (
                      "Attached"
                    ) : (
                      <>
                        <Plus className="size-3" />
                        Attach
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </FormSection>

      <FormSection 
        title="Linked Notes" 
        description={selectedNoteIds.length === 0 ? "No notes linked yet." : `${selectedNoteIds.length} note(s) attached.`}
      >
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[11px] h-7 text-red-400 border-red-900/30 hover:bg-red-950/30"
            onClick={(): void => {
              if (selectedNoteIds.length === 0) return;
              if (confirm("Remove all linked notes from this product?")) {
                selectedNoteIds.forEach((id: string) => removeNote(id));
              }
            }}
            disabled={selectedNoteIds.length === 0}
          >
            Clear All
          </Button>
        </div>

        <div className="mt-2 space-y-2">
          {selectedNoteIds.length === 0 ? null : loadingLinked ? (
            <div className="text-xs text-muted-foreground animate-pulse text-center py-4">Loading linked notes...</div>
          ) : orderedLinked.length === 0 ? (
            <div className="text-xs text-muted-foreground italic text-center py-4">
              Linked note details are unavailable.
            </div>
          ) : (
            orderedLinked.map((note: RelatedNote) => (
              <div
                key={note.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-gray-900 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex size-8 items-center justify-center rounded-md bg-gray-800 text-blue-400">
                    <Link2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-100">{note.title}</div>
                    <div className="truncate text-[10px] text-gray-500 font-mono">{note.id}</div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNote(note.id)}
                  className="h-7 px-2 text-[11px] text-gray-400 hover:text-red-400 hover:bg-red-950/20"
                >
                  Remove
                </Button>
              </div>
            ))
          )}
          {selectedNoteIds.length > 0 && (
            <div className="pt-2 text-[10px] text-gray-500 text-center uppercase tracking-widest font-semibold">
              Manage all content in <Link href="/admin/notes" className="text-blue-400 hover:underline">Notes App</Link>
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}