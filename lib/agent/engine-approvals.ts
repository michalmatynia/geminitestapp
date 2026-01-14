import type { PlanStep } from "@/lib/agent/engine-types";
import { DEBUG_CHATBOT, OLLAMA_BASE_URL } from "@/lib/agent/engine-config";

const parseJsonObject = (content: string): unknown => {
  try {
    const parsed: unknown = JSON.parse(content);
    return parsed;
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      const parsed: unknown = JSON.parse(content.slice(start, end + 1));
      return parsed;
    } catch {
      return null;
    }
  }
};

export function requiresHumanApproval(step: PlanStep, prompt: string) {
  if (step.tool === "none") return false;
  const text = `${step.title} ${prompt}`.toLowerCase();
  return /login|log in|sign in|signup|register|checkout|purchase|pay|payment|card|delete|remove|cancel|unsubscribe|transfer|withdraw|submit order|place order|invoice|billing|confirm|approve|admin/i.test(
    text
  );
}

export async function evaluateApprovalGateWithLLM({
  prompt,
  step,
  model,
  browserContext,
  runId,
}: {
  prompt: string;
  step: PlanStep;
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
  } | null;
  runId?: string;
}): Promise<{
  requiresApproval: boolean;
  reason?: string | null;
  riskLevel?: string | null;
} | null> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You decide whether a planned web action requires human approval. Return only JSON with keys: requiresApproval (boolean), reason (string), riskLevel (low|medium|high), riskySignals (array). Flag any step that involves login, payments, deletions, account changes, admin actions, or irreversible changes.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              step: {
                title: step.title,
                tool: step.tool ?? null,
                expectedObservation: step.expectedObservation ?? null,
                successCriteria: step.successCriteria ?? null,
              },
              browserContext: browserContext
                ? { url: browserContext.url, title: browserContext.title }
                : null,
            }),
          },
        ],
        options: { temperature: 0.1 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Approval gate model failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
    const parsed = parseJsonObject(content) as {
      requiresApproval?: boolean;
      reason?: string;
      riskLevel?: string;
    } | null;
    if (!parsed || typeof parsed.requiresApproval !== "boolean") {
      throw new Error("Approval gate model returned invalid JSON.");
    }
    return {
      requiresApproval: parsed.requiresApproval,
      reason: parsed.reason ?? null,
      riskLevel: parsed.riskLevel ?? null,
    };
  } catch (error) {
    if (runId && DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Approval gate model failed", {
        runId,
        error: error instanceof Error ? error.message : error,
      });
    }
    return null;
  }
}
