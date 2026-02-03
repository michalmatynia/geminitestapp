"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { Button, ConfirmDialog, Input, Label, SectionHeader, SectionPanel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, useToast } from "@/shared/ui";
import { Trash2 } from "lucide-react";
import type { AgentTeachingEmbeddingCollectionRecord, AgentTeachingEmbeddingDocumentListItem } from "@/shared/types/agent-teaching";
import { useAddEmbeddingDocumentMutation, useDeleteEmbeddingDocumentMutation, useEmbeddingDocuments, useTeachingCollections } from "../hooks/useAgentTeaching";

export function AgentTeachingCollectionDetailPage(): React.JSX.Element {
  const { toast } = useToast();
  const params = useParams<{ collectionId: string }>();
  const collectionId = params?.collectionId ?? null;

  const { data: collections = [], isLoading: loadingCollections } = useTeachingCollections();
  const collection: AgentTeachingEmbeddingCollectionRecord | null =
    collectionId
      ? collections.find((c: AgentTeachingEmbeddingCollectionRecord) => c.id === collectionId) ?? null
      : null;

  const { data: docsResult, isLoading: loadingDocs } = useEmbeddingDocuments(collectionId);
  const { mutateAsync: addDoc, isPending: adding } = useAddEmbeddingDocumentMutation();
  const { mutateAsync: deleteDoc, isPending: deleting } = useDeleteEmbeddingDocumentMutation();

  const [text, setText] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [source, setSource] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [docToDelete, setDocToDelete] = React.useState<AgentTeachingEmbeddingDocumentListItem | null>(null);

  const isLoading = loadingCollections || loadingDocs;

  const handleAdd = async (): Promise<void> => {
    if (!collectionId) return;
    const trimmed = text.trim();
    if (!trimmed) {
      toast("Text is required.", { variant: "error" });
      return;
    }
    try {
      await addDoc({
        collectionId,
        text: trimmed,
        title: title.trim() || null,
        source: source.trim() || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast("Document embedded and saved.", { variant: "success" });
      setText("");
      setTitle("");
      setSource("");
      setTags("");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to add document.", { variant: "error" });
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <SectionHeader
        title={collection ? collection.name : "Collection"}
        description="Manage documents (original text + embedding vectors)."
        eyebrow={(
          <Link href="/admin/agentcreator/teaching/collections" className="text-blue-300 hover:text-blue-200">
            ← Back to collections
          </Link>
        )}
        actions={collection ? (
          <div className="text-xs text-gray-400">
            Embedding model: <span className="text-gray-200">{collection.embeddingModel}</span>
          </div>
        ) : undefined}
      />

      <SectionPanel className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Product naming rules" />
          </div>
          <div className="space-y-2">
            <Label>Source (optional)</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. internal wiki / URL / note id" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tags (comma separated)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="pricing, listings, seo" />
        </div>
        <div className="space-y-2">
          <Label>Text to embed</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the original text you want the agent to learn from..."
            className="min-h-[160px]"
          />
          <div className="flex justify-end">
            <Button type="button" onClick={() => void handleAdd()} disabled={adding || deleting || !collectionId || !text.trim()}>
              {adding ? "Embedding..." : "Add to collection"}
            </Button>
          </div>
          <div className="text-[11px] text-gray-500">
            This stores both the text and the embedding vector in MongoDB.
          </div>
        </div>
      </SectionPanel>

      <div className="rounded-md border bg-card/60 backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60">
              <TableHead className="text-xs text-gray-400">Text</TableHead>
              <TableHead className="text-xs text-gray-400">Meta</TableHead>
              <TableHead className="text-xs text-gray-400">Updated</TableHead>
              <TableHead className="text-xs text-gray-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(docsResult?.items ?? []).map((doc: AgentTeachingEmbeddingDocumentListItem) => (
              <TableRow key={doc.id} className="border-border/50">
                <TableCell className="text-sm text-gray-200">
                  <div className="max-w-[520px] truncate" title={doc.text}>
                    {doc.text}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-gray-400">
                  <div className="space-y-1">
                    {doc.metadata?.title ? <div>Title: {doc.metadata.title}</div> : null}
                    {doc.metadata?.source ? <div>Source: {doc.metadata.source}</div> : null}
                    {doc.metadata?.tags?.length ? <div>Tags: {doc.metadata.tags.join(", ")}</div> : null}
                    <div className="text-[11px] text-gray-500">
                      {doc.embeddingModel} ({doc.embeddingDimensions})
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-gray-400">
                  {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(): void => setDocToDelete(doc)}
                    disabled={adding || deleting}
                  >
                    <Trash2 className="mr-1 size-3" />
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {!isLoading && (docsResult?.items ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-sm text-gray-400">
                  No documents yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!docToDelete}
        onOpenChange={(open: boolean): void => {
          if (!open) setDocToDelete(null);
        }}
        title="Delete document"
        description="Delete this embedded document? This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={(): void => {
          if (!collectionId || !docToDelete) return;
          void deleteDoc({ collectionId, documentId: docToDelete.id })
            .then(() => toast("Document deleted.", { variant: "success" }))
            .catch((error: unknown) =>
              toast(error instanceof Error ? error.message : "Failed to delete document.", { variant: "error" })
            )
            .finally(() => setDocToDelete(null));
        }}
      />
    </div>
  );
}

