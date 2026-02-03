"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2, Plus, X } from "lucide-react";
import Link from "next/link";

import { Button, Input, Label } from "@/shared/ui";
import { useProductFormContext } from "@/features/products/context/ProductFormContext";
import type { NoteWithRelations, RelatedNote } from "@/shared/types/notes";

type NotesLookupResult = RelatedNote[];

function useNotesSearch(query: string): { notes: NoteWithRelations[]; loading: boolean } {
  const q = query.trim();
  const res = useQuery({
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
  const res = useQuery({
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
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card/60 p-4">
        <Label htmlFor="note-link-search" className="text-sm font-semibold text-white">
          Search notes to attach
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="note-link-search"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Type at least 2 characters..."
            className="max-w-md"
          />
          {query.trim() && (
            <Button type="button" variant="outline" onClick={() => setQuery("")} title="Clear search">
              <X className="size-4" />
            </Button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {query.trim().length < 2 ? (
            <div className="text-xs text-muted-foreground">Start typing to search notes by title.</div>
          ) : searching ? (
            <div className="text-xs text-muted-foreground">Searching...</div>
          ) : searchResults.length === 0 ? (
            <div className="text-xs text-muted-foreground">No notes found.</div>
          ) : (
            searchResults.slice(0, 10).map((note: NoteWithRelations) => {
              const isLinked = selectedNoteIds.includes(note.id);
              return (
                <div
                  key={note.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-gray-900 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-gray-100">{note.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{note.id}</div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => toggleNote(note.id)}
                    disabled={isLinked}
                    aria-disabled={isLinked}
                    className="rounded bg-white px-2 py-1 text-xs text-gray-900 hover:bg-gray-200 disabled:opacity-60"
                    title={isLinked ? "Already linked" : "Attach note"}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Attach
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-md border border-border bg-card/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Linked notes</div>
            <div className="text-xs text-muted-foreground">
              {selectedNoteIds.length === 0
                ? "No notes linked."
                : `${selectedNoteIds.length} linked note${selectedNoteIds.length === 1 ? "" : "s"}.`}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={(): void => {
              if (selectedNoteIds.length === 0) return;
              if (confirm("Remove all linked notes from this product?")) {
                selectedNoteIds.forEach((id: string) => removeNote(id));
              }
            }}
            disabled={selectedNoteIds.length === 0}
            aria-disabled={selectedNoteIds.length === 0}
          >
            Clear
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {selectedNoteIds.length === 0 ? null : loadingLinked ? (
            <div className="text-xs text-muted-foreground">Loading linked notes...</div>
          ) : orderedLinked.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Linked note details are unavailable (notes may have been deleted).
            </div>
          ) : (
            orderedLinked.map((note: RelatedNote) => (
              <div
                key={note.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-gray-900 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-md bg-gray-800 text-gray-200">
                    <Link2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-gray-100">{note.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{note.id}</div>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => removeNote(note.id)}
                  className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700"
                  title="Detach"
                >
                  Remove
                </Button>
              </div>
            ))
          )}
          {selectedNoteIds.length > 0 && (
            <div className="pt-2 text-xs text-muted-foreground">
              Manage notes in <Link href="/admin/notes" className="underline hover:text-gray-200">Notes</Link>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

