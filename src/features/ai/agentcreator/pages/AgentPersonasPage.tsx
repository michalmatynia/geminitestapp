"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Input, Label, Textarea, useToast, SectionHeader, SectionPanel, Card, AppModal, ModalShell } from "@/shared/ui";
import { useChatbotModels } from "@/features/ai/chatbot/hooks/useChatbotQueries";
import { DEFAULT_MODELS } from "@/features/ai/ai-paths/lib";
import { AgentPersonaSettingsForm } from "@/features/ai/agentcreator/components/AgentPersonaSettingsForm";
import { buildAgentPersonaSettings, createAgentPersonaId } from "@/features/ai/agentcreator/utils/personas";
import { useAgentPersonas, useSaveAgentPersonasMutation } from "@/features/ai/agentcreator/hooks/useAgentPersonas";
import type { AgentPersona, AgentPersonaSettings } from "@/features/ai/agentcreator/types";
import { useCallback } from "react";

const formatTimestamp = (value?: string): string => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
};

const summarizeModels = (settings: AgentPersonaSettings): string[] => {
  const labels: Array<[string, string | null | undefined]> = [
    ["Executor", settings.executorModel],
    ["Planner", settings.plannerModel],
    ["Self-check", settings.selfCheckModel],
    ["Extraction", settings.extractionValidationModel],
    ["Tool router", settings.toolRouterModel],
    ["Memory val.", settings.memoryValidationModel],
    ["Memory sum.", settings.memorySummarizationModel],
    ["Loop guard", settings.loopGuardModel],
    ["Approval", settings.approvalGateModel],
    ["Selector", settings.selectorInferenceModel],
    ["Normalize", settings.outputNormalizationModel],
  ];

  return labels.map(([label, value]: [string, string | null | undefined]) => `${label}: ${value?.trim() || "default"}`);
};

const dedupeModels = (models: string[]): string[] => {
  const seen = new Set<string>();
  return models.filter((model: string) => {
    if (!model) return false;
    if (seen.has(model)) return false;
    seen.add(model);
    return true;
  });
};

export function AgentPersonasPage(): React.JSX.Element {
  const { toast } = useToast();

  const { data: personas = [], isLoading: loading } = useAgentPersonas();
  const { mutateAsync: savePersonas, isPending: saving } = useSaveAgentPersonasMutation();
  const { data: modelOptions = [] } = useChatbotModels();

  const mergedModels = useMemo((): string[] => {
    return dedupeModels([...(modelOptions ?? []), ...DEFAULT_MODELS]);
  }, [modelOptions]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftSettings, setDraftSettings] = useState<AgentPersonaSettings>(
    buildAgentPersonaSettings()
  );
  const [personaToDelete, setPersonaToDelete] = useState<AgentPersona | null>(null);

  const sortedPersonas = useMemo((): AgentPersona[] => {
    return [...personas].sort((a: AgentPersona, b: AgentPersona) => {
      const left = a.updatedAt ?? a.createdAt ?? "";
      const right = b.updatedAt ?? b.createdAt ?? "";
      return right.localeCompare(left);
    });
  }, [personas]);

  const resetDraft = (): void => {
    setEditingId(null);
    setDraftName("");
    setDraftDescription("");
    setDraftSettings(buildAgentPersonaSettings());
  };

  const openCreate = (): void => {
    resetDraft();
    setModalOpen(true);
  };

  const openEdit = (persona: AgentPersona): void => {
    setEditingId(persona.id);
    setDraftName(persona.name);
    setDraftDescription(persona.description ?? "");
    setDraftSettings(buildAgentPersonaSettings(persona.settings));
    setModalOpen(true);
  };

  const closeModal = (): void => {
    setModalOpen(false);
    resetDraft();
  };

  const handleSavePersona = async (): Promise<void> => {
    const name = draftName.trim();
    if (!name) {
      toast("Persona name is required.", { variant: "error" });
      return;
    }

    const now = new Date().toISOString();
    const existing = personas.find((persona: AgentPersona) => persona.id === editingId);
    const nextPersona: AgentPersona = {
      id: existing?.id ?? createAgentPersonaId(),
      name,
      description: draftDescription.trim() || null,
      settings: buildAgentPersonaSettings(draftSettings),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const next = existing
      ? personas.map((persona: AgentPersona) =>
          persona.id === existing.id ? nextPersona : persona
        )
      : [...personas, nextPersona];

    try {
      await savePersonas({ personas: next });
      toast(existing ? "Persona updated." : "Persona created.", { variant: "success" });
      closeModal();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save personas.";
      toast(errorMessage, { variant: "error" });
    }
  };

  const handleDeletePersona = useCallback((persona: AgentPersona): void => {
    setPersonaToDelete(persona);
  }, []);

  return (
    <div className="container mx-auto py-10 space-y-6">
      <SectionHeader
        title="Agent Personas"
        description="Assign models to each reasoning stage for autonomous agents and AI Paths."
        eyebrow={(
          <Link href="/admin/agentcreator" className="text-blue-300 hover:text-blue-200">
            ← Back to agent creator
          </Link>
        )}
        actions={(
          <Button onClick={openCreate} className="gap-2">
            <Plus className="size-4" />
            New Persona
          </Button>
        )}
      />

      <SectionPanel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Persona library</p>
            <p className="mt-1 text-xs text-gray-400">
              Reuse these model stacks when running agents or AI paths.
            </p>
          </div>
          <div className="text-xs text-gray-500">
            {loading ? "Loading..." : `${personas.length} persona(s)`}
          </div>
        </div>
      </SectionPanel>

      {loading ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-gray-400">
          Loading personas...
        </div>
      ) : sortedPersonas.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No personas yet</p>
          <p className="text-sm text-gray-500 mt-1">Create your first agent model stack to define models for each reasoning stage.</p>
          <Button onClick={openCreate} variant="outline" className="mt-4">
            <Plus className="size-4 mr-2" />
            New Persona
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedPersonas.map((persona: AgentPersona) => {
            const tags = summarizeModels(persona.settings);
            return (
              <Card key={persona.id} className="border-border bg-card/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {persona.name}
                    </p>
                    {persona.description ? (
                      <p className="mt-1 text-xs text-gray-400">
                        {persona.description}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        No description provided.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void openEdit(persona)}
                      disabled={saving}
                    >
                      <Pencil className="mr-1 size-3" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePersona(persona)}
                      disabled={saving}
                    >
                      <Trash2 className="mr-1 size-3" />
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full border px-2 py-1 text-[11px] text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                  <span>Updated: {formatTimestamp(persona.updatedAt)}</span>
                  <span>Created: {formatTimestamp(persona.createdAt)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AppModal
        open={modalOpen}
        onOpenChange={(open) => !open && closeModal()}
        title={editingId ? "Edit persona" : "New persona"}
      >
        <ModalShell 
          title={editingId ? "Edit persona" : "New persona"} 
          onClose={closeModal}
          footer={(
            <>
              <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSavePersona()} disabled={saving}>
                {saving ? "Saving..." : "Save persona"}
              </Button>
            </>
          )}
        >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm font-medium text-gray-200">
                Persona name
              </Label>
              <Input
                value={draftName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDraftName(event.target.value)}
                placeholder="Example: Deep reasoning stack"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium text-gray-200">
                Description
              </Label>
              <Textarea
                value={draftDescription}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDraftDescription(event.target.value)
                }
                placeholder="Optional notes for this persona"
                className="min-h-[90px]"
              />
            </div>
          </div>

          <AgentPersonaSettingsForm
            settings={draftSettings}
            onChange={setDraftSettings}
            modelOptions={mergedModels}
          />
        </div>
      </ModalShell>
    </AppModal>
    </div>
  );
}
