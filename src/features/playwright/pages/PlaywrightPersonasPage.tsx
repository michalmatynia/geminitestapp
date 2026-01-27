"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MonitorPlay, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { AppModal } from "@/shared/ui/app-modal";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import ModalShell from "@/shared/components/modal-shell";
import { Textarea } from "@/shared/ui/textarea";
import { useToast } from "@/shared/ui/toast";
import { serializeSetting } from "@/shared/utils/settings-json";
import { SectionHeader } from "@/shared/components/section-header";
import { SectionPanel } from "@/shared/components/section-panel";

import { PlaywrightSettingsForm } from "@/features/playwright/components/PlaywrightSettingsForm";
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from "@/features/playwright/constants/playwright";
import type {
  PlaywrightPersona,
  PlaywrightSettings,
} from "@/features/playwright/types";
import {
  buildPlaywrightSettings,
  createPlaywrightPersonaId,
  fetchPlaywrightPersonas,
} from "@/features/playwright/utils/personas";

const formatTimestamp = (value?: string) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
};

const buildSummaryTags = (settings: PlaywrightSettings) => {
  const tags = [
    settings.headless ? "Headless" : "Headful",
    settings.emulateDevice ? `Device: ${settings.deviceName}` : "Device: default",
    `Timeout: ${settings.timeout}ms`,
    settings.proxyEnabled ? "Proxy: on" : "Proxy: off",
  ];
  if (settings.slowMo > 0) {
    tags.push(`SlowMo: ${settings.slowMo}ms`);
  }
  return tags;
};

export function PlaywrightPersonasPage() {
  const { toast } = useToast();
  const [personas, setPersonas] = useState<PlaywrightPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftSettings, setDraftSettings] = useState<PlaywrightSettings>(
    buildPlaywrightSettings()
  );

  const sortedPersonas = useMemo(() => {
    return [...personas].sort((a, b) => {
      const left = a.updatedAt ?? a.createdAt ?? "";
      const right = b.updatedAt ?? b.createdAt ?? "";
      return right.localeCompare(left);
    });
  }, [personas]);

  useEffect(() => {
    let active = true;
    const loadPersonas = async () => {
      try {
        const stored = await fetchPlaywrightPersonas();
        if (!active) return;
        setPersonas(stored);
      } catch (error) {
        if (active) {
          const message =
            error instanceof Error ? error.message : "Failed to load personas.";
          toast(message, { variant: "error" });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadPersonas();
    return () => {
      active = false;
    };
  }, [toast]);

  const resetDraft = () => {
    setEditingId(null);
    setDraftName("");
    setDraftDescription("");
    setDraftSettings(buildPlaywrightSettings());
  };

  const openCreate = () => {
    resetDraft();
    setModalOpen(true);
  };

  const openEdit = (persona: PlaywrightPersona) => {
    setEditingId(persona.id);
    setDraftName(persona.name);
    setDraftDescription(persona.description ?? "");
    setDraftSettings(buildPlaywrightSettings(persona.settings));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetDraft();
  };

  const persistPersonas = async (next: PlaywrightPersona[], message: string) => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: PLAYWRIGHT_PERSONA_SETTINGS_KEY,
          value: serializeSetting(next),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Failed to save personas.");
      }
      setPersonas(next);
      toast(message, { variant: "success" });
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save personas.";
      toast(errorMessage, { variant: "error" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersona = async () => {
    const name = draftName.trim();
    if (!name) {
      toast("Persona name is required.", { variant: "error" });
      return;
    }

    const now = new Date().toISOString();
    const existing = personas.find((persona) => persona.id === editingId);
    const nextPersona: PlaywrightPersona = {
      id: existing?.id ?? createPlaywrightPersonaId(),
      name,
      description: draftDescription.trim() || null,
      settings: buildPlaywrightSettings(draftSettings),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const next = existing
      ? personas.map((persona) =>
          persona.id === existing.id ? nextPersona : persona
        )
      : [...personas, nextPersona];

    const saved = await persistPersonas(
      next,
      existing ? "Persona updated." : "Persona created."
    );
    if (saved) closeModal();
  };

  const handleDeletePersona = async (persona: PlaywrightPersona) => {
    const confirmed = window.confirm(`Delete persona "${persona.name}"?`);
    if (!confirmed) return;
    const next = personas.filter((item) => item.id !== persona.id);
    await persistPersonas(next, "Persona deleted.");
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <SectionHeader
        title="Playwright Personas"
        description="Centralize browser automation settings to reuse across integrations and chatbot flows."
        eyebrow={(
          <Link href="/admin/settings" className="text-blue-300 hover:text-blue-200">
            ← Back to settings
          </Link>
        )}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="size-4" />
            New Persona
          </Button>
        }
      />

      <SectionPanel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Persona library</p>
            <p className="mt-1 text-xs text-gray-400">
              Assign these presets wherever Playwright is used.
            </p>
          </div>
          <div className="text-xs text-gray-500">
            {loading ? "Loading..." : `${personas.length} persona(s)`}
          </div>
        </div>
      </SectionPanel>

      {loading ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-gray-400">
          Loading personas...
        </div>
      ) : sortedPersonas.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-gray-400">
          No personas yet. Create your first Playwright profile.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedPersonas.map((persona) => {
            const tags = buildSummaryTags(persona.settings);
            return (
              <Card
                key={persona.id}
                className="border-border bg-card/70 p-4"
              >
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
                      onClick={() => openEdit(persona)}
                      disabled={saving}
                    >
                      <Pencil className="mr-1 size-3" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDeletePersona(persona)}
                      disabled={saving}
                    >
                      <Trash2 className="mr-1 size-3" />
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
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
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSavePersona()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save persona"}
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-medium text-gray-200">
                  Persona name
                </Label>
                <Input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Example: Safe desktop headless"
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium text-gray-200">
                  Description
                </Label>
                <Textarea
                  value={draftDescription}
                  onChange={(event) =>
                    setDraftDescription(event.target.value)
                  }
                  placeholder="Optional notes for this persona"
                  className="min-h-[90px]"
                />
              </div>
            </div>

            <PlaywrightSettingsForm
              settings={draftSettings}
              setSettings={setDraftSettings}
              showSave={false}
              title="Persona settings"
              description="Tune browser behavior, timeouts, and automation pacing."
            />
          </div>
        </ModalShell>
      </AppModal>
    </div>
  );
}
