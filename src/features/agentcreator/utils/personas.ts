"use client";

import { parseJsonSetting } from "@/shared/utils/settings-json";
import { AGENT_PERSONA_SETTINGS_KEY, DEFAULT_AGENT_PERSONA_SETTINGS } from "@/features/agentcreator/constants/personas";
import type { AgentPersona, AgentPersonaSettings } from "@/features/agentcreator/types";

export const createAgentPersonaId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `agent-persona-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const buildAgentPersonaSettings = (
  settings?: Partial<AgentPersonaSettings> | null
): AgentPersonaSettings => ({
  ...DEFAULT_AGENT_PERSONA_SETTINGS,
  ...(settings ?? {}),
});

export const normalizeAgentPersonas = (value: unknown): AgentPersona[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: unknown): AgentPersona | null => {
      if (!item || typeof item !== "object") return null;
      const raw = item as AgentPersona;
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      if (!name) return null;

      const id =
        typeof raw.id === "string" && raw.id.trim()
          ? raw.id
          : createAgentPersonaId();
      const createdAt =
        typeof raw.createdAt === "string"
          ? raw.createdAt
          : new Date().toISOString();
      const updatedAt =
        typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt;
      const settings =
        raw.settings && typeof raw.settings === "object"
          ? buildAgentPersonaSettings(raw.settings as Partial<AgentPersonaSettings>)
          : buildAgentPersonaSettings();
      const description =
        typeof raw.description === "string" ? raw.description : null;

      return {
        id,
        name,
        description,
        settings,
        createdAt,
        updatedAt,
      } as AgentPersona;
    })
    .filter((item: AgentPersona | null): item is AgentPersona => Boolean(item));
};

export const fetchAgentPersonas = async (): Promise<AgentPersona[]> => {
  const res = await fetch("/api/settings", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load agent personas.");
  }
  const data = (await res.json()) as Array<{ key: string; value: string }>;
  const map = new Map(
    data.map((item: { key: string; value: string }) => [item.key, item.value])
  );
  const stored = parseJsonSetting<AgentPersona[]>(
    map.get(AGENT_PERSONA_SETTINGS_KEY),
    []
  );
  return normalizeAgentPersonas(stored);
};
