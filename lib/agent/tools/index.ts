import prisma from "@/lib/prisma";
import { validateAndAddAgentLongTermMemory } from "@/lib/agent/memory";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { chromium, firefox, webkit } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";

export type AgentToolRequest = {
  name: "playwright";
  input: {
    prompt?: string;
    browser?: string;
    runId?: string;
    runHeadless?: boolean;
    stepId?: string;
    stepLabel?: string;
  };
};

type ToolOutput = {
  url?: string;
  domText?: string;
  snapshotId?: string | null;
  logCount?: number | null;
  extractedNames?: string[];
  extractedTotal?: number;
  extractedItems?: string[];
  extractionType?: "product_names" | "emails";
};

export type AgentToolResult = {
  ok: boolean;
  output?: ToolOutput;
  error?: string;
  errorId?: string;
};

type AgentControlAction = "goto" | "reload" | "snapshot";

const extractTargetUrl = (prompt?: string) => {
  if (!prompt) return null;
  const urlMatch = prompt.match(/https?:\/\/[^\s)]+/i);
  if (urlMatch) return urlMatch[0];
  const domainMatch = prompt.match(/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i);
  if (domainMatch) {
    return `https://${domainMatch[0]}`;
  }
  if (/base\.com/i.test(prompt)) {
    return "https://base.com";
  }
  return null;
};

const hasExplicitUrl = (prompt?: string) =>
  Boolean(prompt?.match(/https?:\/\/[^\s)]+/i));

const parseCredentials = (prompt?: string) => {
  if (!prompt) return null;
  const emailMatch = prompt.match(/email\s*[:=]\s*([^\s]+)/i);
  const userMatch = prompt.match(/(?:username|user|login)\s*[:=]\s*([^\s]+)/i);
  const passMatch = prompt.match(/(?:password|pass|pwd)\s*[:=]\s*([^\s]+)/i);
  const email = emailMatch?.[1];
  const username = userMatch?.[1];
  const password = passMatch?.[1];
  if (!password || (!email && !username)) return null;
  return { email, username, password };
};

const parseExtractionRequest = (prompt?: string) => {
  if (!prompt) return null;
  const taskTypeHint = /task type:\s*extract_info/i.test(prompt);
  const wantsExtraction =
    taskTypeHint ||
    /(extract|collect|find|list|get)\b/i.test(prompt);
  if (/task type:\s*web_task/i.test(prompt) && !wantsExtraction) return null;
  if (!wantsExtraction) return null;
  const isProduct = /product/i.test(prompt);
  const isEmail = /email/i.test(prompt);
  const countMatch = prompt.match(/(\d+)\s*(?:products?|product names?|emails?)/i);
  const count = countMatch ? Number(countMatch[1]) : null;
  if (isEmail) {
    return { type: "emails" as const, count };
  }
  if (isProduct) {
    return { type: "product_names" as const, count };
  }
  if (taskTypeHint) {
    return { type: "emails" as const, count };
  }
  return null;
};

const getTargetHostname = (prompt?: string) => {
  const url = extractTargetUrl(prompt);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
};

const isAllowedUrl = (url: string, targetHostname: string | null) => {
  if (!targetHostname) return true;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    return hostname === targetHostname || hostname.endsWith(`.${targetHostname}`);
  } catch {
    return false;
  }
};

const normalizeProductNames = (items: string[]) => {
  const seen = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => /[a-z]/i.test(item))
    .filter((item) => !/^[a-f0-9]{16,}$/i.test(item))
    .filter((item) => !/^[a-f0-9]{32,}$/i.test(item))
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const buildEvidenceSnippets = (items: string[], domText: string) => {
  const evidence: Array<{ item: string; snippet: string }> = [];
  if (!domText) return evidence;
  const lowerText = domText.toLowerCase();
  for (const item of items) {
    const query = item.trim().toLowerCase();
    if (!query) continue;
    const index = lowerText.indexOf(query);
    if (index === -1) continue;
    const start = Math.max(0, index - 60);
    const end = Math.min(domText.length, index + query.length + 60);
    evidence.push({ item, snippet: domText.slice(start, end) });
  }
  return evidence;
};

const toDataUrl = (buffer: Buffer) =>
  `data:image/png;base64,${buffer.toString("base64")}`;

const safeText = (value: string | null | undefined) => value ?? "";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3-vl:30b";
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const BRAVE_SEARCH_API_URL =
  process.env.BRAVE_SEARCH_API_URL || "https://api.search.brave.com/res/v1/web/search";
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const GOOGLE_SEARCH_API_URL =
  process.env.GOOGLE_SEARCH_API_URL || "https://www.googleapis.com/customsearch/v1";
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const SERPAPI_API_URL = process.env.SERPAPI_API_URL || "https://serpapi.com/search.json";

const resolveIgnoreRobotsTxt = (planState: unknown) => {
  if (!planState || typeof planState !== "object") return false;
  const prefs = (planState as { preferences?: { ignoreRobotsTxt?: boolean } })
    .preferences;
  return Boolean(prefs?.ignoreRobotsTxt);
};

  export async function runAgentTool(request: AgentToolRequest): Promise<AgentToolResult> {
  const { runId, prompt, browser, runHeadless, stepId, stepLabel } = request.input;
  const debugEnabled = process.env.DEBUG_CHATBOT === "true";
  if (!runId) {
    return { ok: false, error: "Missing runId for tool execution." };
  }

  if (!("agentBrowserLog" in prisma) || !("agentBrowserSnapshot" in prisma)) {
    return {
      ok: false,
      error: "Agent browser tables not initialized. Run prisma generate/db push.",
    };
  }

  try {
    const targetUrl = extractTargetUrl(prompt) ?? "about:blank";
    const targetHostname = getTargetHostname(prompt);
    const runRecord =
      "chatbotAgentRun" in prisma
        ? await prisma.chatbotAgentRun.findUnique({
            where: { id: runId },
            select: {
              model: true,
              searchProvider: true,
              planState: true,
              memoryKey: true,
            },
          })
        : null;
    const resolvedModel = runRecord?.model || DEFAULT_OLLAMA_MODEL;
    const resolvedSearchProvider = runRecord?.searchProvider ?? "brave";
    const ignoreRobotsTxt = resolveIgnoreRobotsTxt(runRecord?.planState);
    const memoryKey = runRecord?.memoryKey ?? null;
    const memoryValidationModel =
      runRecord?.planState &&
      typeof runRecord.planState === "object" &&
      typeof (runRecord.planState as { preferences?: { memoryValidationModel?: string } })
        .preferences?.memoryValidationModel === "string"
        ? (
            runRecord.planState as {
              preferences?: { memoryValidationModel?: string };
            }
          ).preferences?.memoryValidationModel ?? null
        : null;
    const extractionValidationModel =
      runRecord?.planState &&
      typeof runRecord.planState === "object" &&
      typeof (runRecord.planState as { preferences?: { extractionValidationModel?: string } })
        .preferences?.extractionValidationModel === "string"
        ? (
            runRecord.planState as {
              preferences?: { extractionValidationModel?: string };
            }
          ).preferences?.extractionValidationModel ?? null
        : null;
    const selectorInferenceModel =
      runRecord?.planState &&
      typeof runRecord.planState === "object" &&
      typeof (runRecord.planState as { preferences?: { selectorInferenceModel?: string } })
        .preferences?.selectorInferenceModel === "string"
        ? (
            runRecord.planState as {
              preferences?: { selectorInferenceModel?: string };
            }
          ).preferences?.selectorInferenceModel ?? null
        : null;
    const outputNormalizationModel =
      runRecord?.planState &&
      typeof runRecord.planState === "object" &&
      typeof (runRecord.planState as { preferences?: { outputNormalizationModel?: string } })
        .preferences?.outputNormalizationModel === "string"
        ? (
            runRecord.planState as {
              preferences?: { outputNormalizationModel?: string };
            }
          ).preferences?.outputNormalizationModel ?? null
        : null;
    const browserType =
      browser === "firefox" ? firefox : browser === "webkit" ? webkit : chromium;

    const validateExtractionWithLLM = async (params: {
      prompt: string;
      url: string;
      extractionType: "product_names" | "emails";
      requiredCount: number;
      items: string[];
      domTextSample: string;
      targetHostname: string | null;
      evidence: Array<{ item: string; snippet: string }>;
    }) => {
      const {
        prompt,
        url,
        extractionType,
        requiredCount,
        items,
        domTextSample,
        targetHostname,
        evidence,
      } = params;
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: extractionValidationModel ?? resolvedModel,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "You validate extraction results against the user goal. Return only JSON with keys: valid (boolean), acceptedItems (array), rejectedItems (array), issues (array of strings), missingCount (number), evidence (array of {item, snippet, reason}). Each accepted item must cite evidence from the provided snippets. If the URL hostname does not match targetHostname (when provided), mark valid=false. For product_names, reject non-product UI text (cookies, headings, nav labels).",
              },
              {
                role: "user",
                content: JSON.stringify({
                  prompt,
                  url,
                  extractionType,
                  requiredCount,
                  items,
                  domTextSample,
                  targetHostname,
                  evidence,
                }),
              },
            ],
            options: { temperature: 0.2 },
          }),
        });
        if (!response.ok) {
          throw new Error(`Extraction validation failed (${response.status}).`);
        }
        const payload = await response.json();
        const content = payload?.message?.content || "";
        const match = content.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : JSON.parse(content);
        const acceptedItems = Array.isArray(parsed?.acceptedItems)
          ? parsed.acceptedItems.filter((item: unknown) => typeof item === "string")
          : [];
        const rejectedItems = Array.isArray(parsed?.rejectedItems)
          ? parsed.rejectedItems.filter((item: unknown) => typeof item === "string")
          : [];
        const issues = Array.isArray(parsed?.issues)
          ? parsed.issues.filter((item: unknown) => typeof item === "string")
          : [];
        const missingCount =
          typeof parsed?.missingCount === "number"
            ? parsed.missingCount
            : Math.max(0, requiredCount - acceptedItems.length);
        const valid =
          typeof parsed?.valid === "boolean"
            ? parsed.valid
            : acceptedItems.length >= requiredCount;
        return {
          valid,
          acceptedItems,
          rejectedItems,
          issues,
          missingCount,
          evidence: Array.isArray(parsed?.evidence) ? parsed.evidence : [],
        };
      } catch (error) {
        const fallbackAccepted = evidence.map((entry) => entry.item);
        return {
          valid: fallbackAccepted.length >= requiredCount,
          acceptedItems: fallbackAccepted,
          rejectedItems: items.filter((item) => !fallbackAccepted.includes(item)),
          issues: [
            `LLM validation failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
          missingCount: Math.max(0, requiredCount - fallbackAccepted.length),
          evidence,
        };
      }
    };

    const normalizeExtractionItemsWithLLM = async (params: {
      prompt: string;
      extractionType: "product_names" | "emails";
      items: string[];
    }) => {
      const { prompt: normalizePrompt, extractionType, items } = params;
      if (!outputNormalizationModel || items.length === 0) {
        return items;
      }
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: outputNormalizationModel,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "You clean extracted outputs. Return only JSON with key 'items' as an array of cleaned strings. Remove hashes, IDs, boilerplate, and duplicates. Keep original ordering where possible. For emails, return lowercase valid emails only.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  prompt: normalizePrompt,
                  extractionType,
                  items,
                }),
              },
            ],
            options: { temperature: 0.1 },
          }),
        });
        if (!response.ok) {
          throw new Error(`Output normalization failed (${response.status}).`);
        }
        const payload = await response.json();
        const content = payload?.message?.content?.trim() ?? "";
        const parsed = (() => {
          try {
            return JSON.parse(content);
          } catch {
            const start = content.indexOf("{");
            const end = content.lastIndexOf("}");
            if (start === -1 || end <= start) return null;
            try {
              return JSON.parse(content.slice(start, end + 1));
            } catch {
              return null;
            }
          }
        })();
        const cleaned = Array.isArray(parsed?.items)
          ? parsed.items.filter((item: unknown) => typeof item === "string")
          : [];
        return cleaned.length > 0 ? cleaned : items;
      } catch {
        return items;
      }
    };

    let launch: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let videoPath: string | null = null;
    const runDir = path.join(process.cwd(), "tmp", "chatbot-agent", runId);
    await fs.mkdir(runDir, { recursive: true });

    launch = await browserType.launch({
      headless: runHeadless ?? true,
    });

    const activeStepId = stepId ?? null;
    const log = async (
      level: string,
      message: string,
      metadata?: Record<string, unknown>
    ) => {
      const normalizeLogMetadata = async (payload?: Record<string, unknown>) => {
        if (!payload || !outputNormalizationModel) return payload;
        const extractionType = payload.extractionType;
        if (extractionType !== "product_names" && extractionType !== "emails") {
          return payload;
        }
        const normalizeField = async (key: string) => {
          const value = payload[key];
          if (!Array.isArray(value)) return;
          const items = value.filter((item) => typeof item === "string") as string[];
          if (items.length === 0) return;
          const normalized = await normalizeExtractionItemsWithLLM({
            prompt: prompt ?? "",
            extractionType,
            items,
          });
          payload[key] = normalized;
        };
        await Promise.all([
          normalizeField("items"),
          normalizeField("names"),
          normalizeField("extractedItems"),
          normalizeField("extractedNames"),
        ]);
        return payload;
      };
      const normalizedMetadata = await normalizeLogMetadata(
        metadata ? { ...metadata } : undefined
      );
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          stepId: activeStepId,
          level,
          message,
          metadata: normalizedMetadata,
        },
      });
    };

    const loadRobotsTxt = async (url: string) => {
      try {
        const target = new URL(url);
        const robotsUrl = `${target.origin}/robots.txt`;
        const response = await fetch(robotsUrl, { method: "GET" });
        if (!response.ok) {
          return { ok: false, status: response.status, content: "" };
        }
        const content = await response.text();
        return { ok: true, status: response.status, content };
      } catch (error) {
        return {
          ok: false,
          status: null,
          content: "",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    };

    const parseRobotsRules = (robotsTxt: string) => {
      const rules = new Map<string, Array<{ type: "allow" | "disallow"; path: string }>>();
      let currentAgents: string[] = [];
      const lines = robotsTxt.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.split("#")[0]?.trim();
        if (!line) continue;
        const [rawKey, ...rest] = line.split(":");
        const key = rawKey?.trim().toLowerCase();
        const value = rest.join(":").trim();
        if (!key) continue;
        if (key === "user-agent") {
          const agent = value.toLowerCase();
          currentAgents = agent ? [agent] : [];
          for (const entry of currentAgents) {
            if (!rules.has(entry)) {
              rules.set(entry, []);
            }
          }
          continue;
        }
        if (key === "allow" || key === "disallow") {
          if (currentAgents.length === 0) continue;
          for (const agent of currentAgents) {
            const list = rules.get(agent) ?? [];
            list.push({ type: key as "allow" | "disallow", path: value });
            rules.set(agent, list);
          }
        }
      }
      return rules;
    };

    const evaluateRobotsRules = (
      rules: Array<{ type: "allow" | "disallow"; path: string }>,
      path: string
    ) => {
      let bestMatch: { type: "allow" | "disallow"; path: string } | null = null;
      for (const rule of rules) {
        if (!rule.path) {
          if (rule.type === "allow" && !bestMatch) {
            bestMatch = rule;
          }
          continue;
        }
        if (path.startsWith(rule.path)) {
          if (!bestMatch || rule.path.length > bestMatch.path.length) {
            bestMatch = rule;
          } else if (
            bestMatch &&
            rule.path.length === bestMatch.path.length &&
            rule.type === "allow"
          ) {
            bestMatch = rule;
          }
        }
      }
      if (!bestMatch) return { allowed: true, matchedRule: null };
      return {
        allowed: bestMatch.type !== "disallow",
        matchedRule: bestMatch,
      };
    };

    const enforceRobotsPolicy = async (url: string) => {
      if (ignoreRobotsTxt) return true;
      if (!url || url === "about:blank") return true;
      const robots = await loadRobotsTxt(url);
      if (!robots.ok) {
        await log("warning", "Robots.txt unavailable; proceeding.", {
          url,
          status: robots.status,
          error: robots.error ?? null,
        });
        return true;
      }
      const parsed = parseRobotsRules(robots.content);
      const rules = parsed.get("*") ?? [];
      const pathName = new URL(url).pathname || "/";
      const evaluation = evaluateRobotsRules(rules, pathName);
      if (!evaluation.allowed) {
        await log("warning", "Blocked by robots.txt.", {
          url,
          path: pathName,
          matchedRule: evaluation.matchedRule,
        });
        return false;
      }
      return true;
    };

    context = await launch.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: runDir,
        size: { width: 1280, height: 720 },
      },
    });
    page = await context.newPage();
    if (!page) {
      throw new Error("Failed to initialize Playwright page.");
    }

    page.on("console", async (msg) => {
      const type = msg.type();
      await log(type === "error" ? "error" : "info", `[console:${type}] ${msg.text()}`);
    });
    page.on("pageerror", async (err) => {
      await log("error", `Page error: ${err.message}`);
    });
    page.on("requestfailed", async (req) => {
      await log("warning", `Request failed: ${req.url()}`, {
        error: req.failure()?.errorText,
      });
    });
    let cloudflareDetected = false;
    const detectChallenge = (text: string) =>
      /cloudflare|attention required|cf-browser-verification|challenge-platform|cf-turnstile/i.test(
        text
      );
    const flagCloudflare = async (source: string, detail?: string) => {
      if (cloudflareDetected) return;
      cloudflareDetected = true;
      await log("warning", "Cloudflare challenge detected.", {
        source,
        detail,
        stepId: stepId ?? null,
      });
    };
    page.on("response", async (res) => {
      const status = res.status();
      if (status === 403) {
        const url = res.url();
        if (/cloudflare|cdn-cgi|login\.baselinker\.com/i.test(url)) {
          await flagCloudflare("response-403", url);
        }
      }
    });

    await log("info", "Playwright tool started.", {
      browser: browser || "chromium",
      runHeadless: runHeadless ?? true,
      targetUrl,
    });

    const collectUiInventory = async (label: string, activeStepId?: string) => {
      if (!page) return null;
      try {
        const uiInventory = await page.evaluate(() => {
          const cssPath = (el: Element) => {
            if (!(el instanceof Element)) return null;
            if (el.id) return `#${CSS.escape(el.id)}`;
            const parts: string[] = [];
            let node: Element | null = el;
            while (node && node.nodeType === 1 && node !== document.documentElement) {
              let part = node.tagName.toLowerCase();
              const name = node.getAttribute("name");
              const dataTest =
                node.getAttribute("data-testid") ||
                node.getAttribute("data-test") ||
                node.getAttribute("data-qa");
              if (name) {
                part += `[name="${name.replace(/"/g, '\\"')}"]`;
              } else if (dataTest) {
                part += `[data-testid="${dataTest.replace(/"/g, '\\"')}"]`;
              }
              const parent = node.parentElement;
              if (parent) {
                const siblings = Array.from(parent.children).filter(
                  (child) => child.tagName === node!.tagName
                );
                if (siblings.length > 1) {
                  part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
                }
              }
              parts.unshift(part);
              node = node.parentElement;
            }
            return parts.join(" > ");
          };

          const visible = (el: Element) =>
            (el as HTMLElement).offsetParent !== null;
          const describe = (el: Element) => ({
            tag: el.tagName.toLowerCase(),
            id: (el as HTMLElement).id || null,
            name: (el as HTMLInputElement).name || null,
            type: (el as HTMLInputElement).type || null,
            text: (el as HTMLElement).innerText?.trim().slice(0, 160) || null,
            placeholder: (el as HTMLInputElement).placeholder || null,
            ariaLabel: el.getAttribute("aria-label"),
            role: el.getAttribute("role"),
            selector: cssPath(el),
          });

          const cap = 200;
          const inputs = Array.from(document.querySelectorAll("input, textarea, select"))
            .filter(visible)
            .map(describe);
          const buttons = Array.from(
            document.querySelectorAll("button, input[type='submit'], input[type='button']")
          )
            .filter(visible)
            .map(describe);
          const links = Array.from(document.querySelectorAll("a[href]"))
            .filter(visible)
            .map((el) => ({
              ...describe(el),
              href: (el as HTMLAnchorElement).href,
            }));
          const headings = Array.from(
            document.querySelectorAll("h1, h2, h3, h4, h5, h6")
          )
            .filter(visible)
            .map(describe);
          const forms = Array.from(document.querySelectorAll("form"))
            .filter(visible)
            .map((el) => ({
              ...describe(el),
              action: (el as HTMLFormElement).action || null,
              method: (el as HTMLFormElement).method || null,
            }));

          const truncated = {
            inputs: inputs.length > cap,
            buttons: buttons.length > cap,
            links: links.length > cap,
            headings: headings.length > cap,
            forms: forms.length > cap,
          };

          return {
            url: location.href,
            title: document.title,
            counts: {
              inputs: inputs.length,
              buttons: buttons.length,
              links: links.length,
              headings: headings.length,
              forms: forms.length,
            },
            inputs: inputs.slice(0, cap),
            buttons: buttons.slice(0, cap),
            links: links.slice(0, cap),
            headings: headings.slice(0, cap),
            forms: forms.slice(0, cap),
            truncated,
          };
        });

        await log("info", "Captured UI inventory.", {
          label,
          stepId: activeStepId ?? null,
          uiInventory,
        });
        await prisma.agentAuditLog.create({
          data: {
            runId,
            level: "info",
            message: "Captured UI inventory.",
            metadata: {
              label,
              stepId: activeStepId ?? null,
              uiInventory,
            },
          },
        });
        return uiInventory;
      } catch (error) {
        await log("warning", "Failed to capture UI inventory.", {
          label,
          stepId: activeStepId ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    };

    const captureSessionContext = async (label: string) => {
      if (!page || !context) return;
      try {
        const cookies = await context.cookies();
        const cookieSummary = cookies.map((cookie) => ({
          name: cookie.name,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          valueLength: cookie.value?.length ?? 0,
        }));

        const storageSummary = await page.evaluate(() => {
          const localKeys = Object.keys(localStorage ?? {});
          const sessionKeys = Object.keys(sessionStorage ?? {});
          return {
            localKeys,
            sessionKeys,
            localCount: localKeys.length,
            sessionCount: sessionKeys.length,
          };
        });

        await prisma.agentAuditLog.create({
          data: {
            runId,
            level: "info",
            message: "Captured session context.",
            metadata: {
              label,
              url: page.url(),
              title: await page.title(),
              cookies: cookieSummary,
              storage: storageSummary,
              stepId: activeStepId ?? null,
            },
          },
        });
        await log("info", "Captured session context.", {
          label,
          url: page.url(),
          title: await page.title(),
          cookies: cookieSummary,
          storage: storageSummary,
          stepId: activeStepId ?? null,
        });
      } catch (error) {
        await log("warning", "Failed to capture session context.", {
          label,
          error: error instanceof Error ? error.message : String(error),
          stepId: activeStepId ?? null,
        });
      }
    };

    const captureSnapshot = async (label: string, activeStepId?: string) => {
      if (!page) {
        return { domText: "", domHtml: "", url: "" };
      }
      const domHtml = await page.content();
      const domText = await page.evaluate(
        () => document.body?.innerText || document.documentElement?.innerText || ""
      );
      const title = await page.title();
      const snapshotUrl = page.url();
      const screenshotBuffer = await page.screenshot({ fullPage: true });
      const safeLabel = label.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
      const screenshotFile = `snapshot-${Date.now()}-${safeLabel}.png`;
      const screenshotPath = path.join(runDir, screenshotFile);
      await fs.writeFile(screenshotPath, screenshotBuffer);
      const viewport = page.viewportSize();

      await prisma.agentBrowserSnapshot.create({
        data: {
          runId,
          url: snapshotUrl,
          title,
          domHtml,
          domText,
          screenshotData: toDataUrl(screenshotBuffer),
          screenshotPath: screenshotFile,
          stepId: activeStepId ?? null,
          mouseX: null,
          mouseY: null,
          viewportWidth: viewport?.width ?? null,
          viewportHeight: viewport?.height ?? null,
        },
      });

      await log("info", "Captured DOM snapshot.", {
        label,
        screenshotFile,
        domTextLength: domText.length,
        domHtmlLength: domHtml.length,
        stepId: activeStepId ?? null,
      });
      await collectUiInventory(label, activeStepId);
      await captureSessionContext(label);
      return { domText, domHtml, url: snapshotUrl };
    };

    const extractProductNames = async () => {
      if (!page) return [];
      return page.evaluate(() => {
        const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
        const candidates: string[] = [];
        const seen = new Set<string>();

        const pushName = (value: string | null | undefined) => {
          if (!value) return;
          const cleaned = normalize(value);
          if (cleaned.length < 3 || cleaned.length > 140) return;
          if (seen.has(cleaned.toLowerCase())) return;
          seen.add(cleaned.toLowerCase());
          candidates.push(cleaned);
        };

        const productSelectors = [
          "[data-product]",
          "[data-product-name]",
          "[data-testid*='product' i]",
          "[itemtype*='Product']",
          ".product",
          ".product-item",
          ".product-card",
          ".product-tile",
          ".product-grid > *",
          ".collection-product",
          ".collection-item",
          ".grid-item",
          "article",
          "[class*='product' i]",
          "[class*='card' i]",
          "[class*='grid' i]",
          "[class*='item' i]",
        ];
        const nameSelectors = [
          "[data-product-name]",
          "[data-testid*='title' i]",
          "[itemprop='name']",
          ".product-title",
          ".product-name",
          ".product-card__title",
          ".card__heading",
          ".product-item__title",
          ".card-title",
          ".card__title",
          ".item-title",
          ".listing-title",
          "h1",
          "h2",
          "h3",
          "h4",
        ];

        for (const selector of productSelectors) {
          document.querySelectorAll(selector).forEach((node) => {
            const element = node as HTMLElement;
            for (const nameSelector of nameSelectors) {
              const nameNode = element.querySelector(nameSelector) as HTMLElement | null;
              if (nameNode?.innerText) {
                pushName(nameNode.innerText);
                break;
              }
            }
            if (element.getAttribute("data-product-name")) {
              pushName(element.getAttribute("data-product-name"));
            }
            const img = element.querySelector("img[alt]") as HTMLImageElement | null;
            if (img?.alt) {
              pushName(img.alt);
            }
          });
        }

        document
          .querySelectorAll("a[href*='/product' i], a[href*='product' i]")
          .forEach((link) => {
            const text = (link as HTMLElement).innerText;
            if (text) pushName(text);
          });

        document.querySelectorAll("h2, h3, h4").forEach((heading) => {
          pushName((heading as HTMLElement).innerText);
        });

        return candidates;
      });
    };

    const extractProductNamesFromSelectors = async (selectors: string[]) => {
      if (!page || selectors.length === 0) return [];
      return page.evaluate((selectorsParam) => {
        const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
        const candidates: string[] = [];
        const seen = new Set<string>();

        const pushName = (value: string | null | undefined) => {
          if (!value) return;
          const cleaned = normalize(value);
          if (cleaned.length < 3 || cleaned.length > 140) return;
          if (seen.has(cleaned.toLowerCase())) return;
          seen.add(cleaned.toLowerCase());
          candidates.push(cleaned);
        };

        selectorsParam.forEach((selector) => {
          document.querySelectorAll(selector).forEach((node) => {
            const element = node as HTMLElement;
            const text = element.innerText || element.textContent;
            if (text) pushName(text);
            if (element.getAttribute("data-product-name")) {
              pushName(element.getAttribute("data-product-name"));
            }
            const img = element.querySelector("img[alt]") as HTMLImageElement | null;
            if (img?.alt) {
              pushName(img.alt);
            }
          });
        });

        return candidates;
      }, selectors);
    };

    const waitForProductContent = async () => {
      if (!page) return;
      const productSelectors = [
        "[data-product]",
        "[data-product-name]",
        "[data-testid*='product' i]",
        "[itemtype*='Product']",
        ".product",
        ".product-item",
        ".product-card",
        ".product-tile",
        ".product-grid > *",
        ".collection-product",
        ".collection-item",
        ".grid-item",
        "article",
        "[class*='product' i]",
        "[class*='card' i]",
        "[class*='grid' i]",
        "[class*='item' i]",
      ];
      try {
        await page.waitForLoadState("networkidle", { timeout: 15000 });
      } catch {
        // Ignore network idle timeouts.
      }
      try {
        await Promise.race(
          productSelectors.map((selector) =>
            page.waitForSelector(selector, { timeout: 4000 })
          )
        );
      } catch {
        // Ignore if no product selectors appear quickly.
      }
    };

    const autoScroll = async () => {
      if (!page) return;
      await page.evaluate(async () => {
        const totalHeight = document.body.scrollHeight;
        const distance = Math.min(800, window.innerHeight || 800);
        let current = 0;
        while (current < totalHeight) {
          window.scrollBy(0, distance);
          current += distance;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        window.scrollTo(0, 0);
      });
    };

    const checkForChallenge = async (source: string) => {
      if (!page) return false;
      const html = await page.content();
      const text = await page.evaluate(
        () => document.body?.innerText || document.documentElement?.innerText || ""
      );
      if (detectChallenge(text) || detectChallenge(html)) {
        await flagCloudflare(source, "challenge markers in DOM/HTML");
        return true;
      }
      return false;
    };

    const dismissConsent = async (label: string) => {
      if (!page) return;
      const buttonText =
        /accept|agree|ok|got it|allow all|accept all|dismiss|close/i;
      const selectors = [
        "button",
        "[role='button']",
        "input[type='button']",
        "input[type='submit']",
        "[data-testid*='consent' i]",
        "[data-testid*='cookie' i]",
        "[aria-label*='accept' i]",
        "[aria-label*='cookie' i]",
      ];
      try {
        const candidates = page.locator(selectors.join(", "));
        const count = await candidates.count();
        for (let i = 0; i < count; i += 1) {
          const candidate = candidates.nth(i);
          const text = (await candidate.innerText()).trim();
          if (text && buttonText.test(text)) {
            await candidate.click({ timeout: 2000 });
            await log("info", "Dismissed consent banner.", {
              label,
              text,
              stepId: activeStepId ?? null,
            });
            return;
          }
        }
      } catch {
        // ignore consent failures
      }
    };

    const findProductListingUrls = async () => {
      if (!page) return [];
      return page.evaluate(() => {
        const keywords =
          /(shop|store|product|collection|catalog|menu|shopall|shop-all|merch)/i;
        const origin = location.origin;
        const urls = new Set<string>();
        document.querySelectorAll("a[href]").forEach((link) => {
          const href = (link as HTMLAnchorElement).href;
          const text = (link as HTMLElement).innerText || "";
          if (!href || !href.startsWith(origin)) return;
          if (keywords.test(href) || keywords.test(text)) {
            urls.add(href);
          }
        });
        return Array.from(urls).slice(0, 5);
      });
    };

    const inferSelectorsFromLLM = async (
      uiInventory: unknown,
      domTextSample: string,
      task: string,
      label: string
    ) => {
      if (!uiInventory) return [];
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectorInferenceModel ?? resolvedModel,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "You are a DOM selector expert. Return only JSON with a 'selectors' array. Use concise, robust CSS selectors.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  task,
                  domTextSample,
                  uiInventory,
                }),
              },
            ],
            options: { temperature: 0.2 },
          }),
        });
        if (!response.ok) {
          throw new Error(`LLM selector inference failed (${response.status}).`);
        }
        const json = await response.json();
        const content = json?.message?.content || "";
        const match = content.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : JSON.parse(content);
        const selectors = Array.isArray(parsed?.selectors)
          ? parsed.selectors.filter((selector: unknown) => typeof selector === "string")
          : [];
        await log("info", "LLM selector inference completed.", {
          stepId: activeStepId ?? null,
          label,
          task,
          selectors,
        });
        await prisma.agentAuditLog.create({
          data: {
            runId,
            level: "info",
            message: "LLM selector inference completed.",
            metadata: {
              label,
              task,
              selectors,
              model: resolvedModel,
              stepId: activeStepId ?? null,
            },
          },
        });
        return selectors;
      } catch (error) {
        await log("warning", "LLM selector inference failed.", {
          stepId: activeStepId ?? null,
          label,
          task,
          error: error instanceof Error ? error.message : String(error),
        });
        return [];
      }
    };

    const buildExtractionPlan = async (request: {
      type: "product_names" | "emails";
      domTextSample: string;
      uiInventory: unknown;
    }) => {
      if (!request.uiInventory) return null;
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectorInferenceModel ?? resolvedModel,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "You are an extraction planner. Return only JSON with keys: target, fields, primarySelectors, fallbackSelectors, notes. target is the data entity. fields is an array of field names. primarySelectors/fallbackSelectors are arrays of CSS selectors.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  request: request.type,
                  domTextSample: request.domTextSample,
                  uiInventory: request.uiInventory,
                }),
              },
            ],
            options: { temperature: 0.2 },
          }),
        });
        if (!response.ok) {
          throw new Error(`Extraction planner failed (${response.status}).`);
        }
        const json = await response.json();
        const content = json?.message?.content || "";
        const match = content.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : JSON.parse(content);
        const primarySelectors = Array.isArray(parsed?.primarySelectors)
          ? parsed.primarySelectors.filter(
              (selector: unknown) => typeof selector === "string"
            )
          : [];
        const fallbackSelectors = Array.isArray(parsed?.fallbackSelectors)
          ? parsed.fallbackSelectors.filter(
              (selector: unknown) => typeof selector === "string"
            )
          : [];
        const plan = {
          target: typeof parsed?.target === "string" ? parsed.target : null,
          fields: Array.isArray(parsed?.fields)
            ? parsed.fields.filter((field: unknown) => typeof field === "string")
            : [],
          primarySelectors,
          fallbackSelectors,
          notes: typeof parsed?.notes === "string" ? parsed.notes : null,
        };
        await log("info", "LLM extraction plan created.", {
          stepId: activeStepId ?? null,
          plan,
        });
        await prisma.agentAuditLog.create({
          data: {
            runId,
            level: "info",
            message: "LLM extraction plan created.",
            metadata: {
              plan,
              model: resolvedModel,
              stepId: activeStepId ?? null,
            },
          },
        });
        return plan;
      } catch (error) {
        await log("warning", "LLM extraction plan failed.", {
          stepId: activeStepId ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    };

    const buildFailureRecoveryPlan = async (request: {
      type: "bad_selectors" | "login_stuck" | "missing_extraction";
      prompt: string;
      url: string;
      domTextSample: string;
      uiInventory: unknown;
      extractionPlan?: unknown;
      loginCandidates?: unknown;
    }) => {
      if (!request.uiInventory) return null;
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectorInferenceModel ?? resolvedModel,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "You recover failed web automation. Return only JSON with keys: reason, selectors, listingUrls, clickSelector, loginUrl, usernameSelector, passwordSelector, submitSelector, notes. Provide only fields relevant to the failure type.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  failureType: request.type,
                  prompt: request.prompt,
                  url: request.url,
                  domTextSample: request.domTextSample,
                  uiInventory: request.uiInventory,
                  extractionPlan: request.extractionPlan ?? null,
                  loginCandidates: request.loginCandidates ?? null,
                }),
              },
            ],
            options: { temperature: 0.2 },
          }),
        });
        if (!response.ok) {
          throw new Error(`Failure recovery planner failed (${response.status}).`);
        }
        const json = await response.json();
        const content = json?.message?.content || "";
        const match = content.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : JSON.parse(content);
        const selectors = Array.isArray(parsed?.selectors)
          ? parsed.selectors.filter((selector: unknown) => typeof selector === "string")
          : [];
        const listingUrls = Array.isArray(parsed?.listingUrls)
          ? parsed.listingUrls.filter((item: unknown) => typeof item === "string")
          : [];
        const plan = {
          reason: typeof parsed?.reason === "string" ? parsed.reason : null,
          selectors,
          listingUrls,
          clickSelector:
            typeof parsed?.clickSelector === "string" ? parsed.clickSelector : null,
          loginUrl: typeof parsed?.loginUrl === "string" ? parsed.loginUrl : null,
          usernameSelector:
            typeof parsed?.usernameSelector === "string"
              ? parsed.usernameSelector
              : null,
          passwordSelector:
            typeof parsed?.passwordSelector === "string"
              ? parsed.passwordSelector
              : null,
          submitSelector:
            typeof parsed?.submitSelector === "string" ? parsed.submitSelector : null,
          notes: typeof parsed?.notes === "string" ? parsed.notes : null,
        };
        await log("info", "LLM failure recovery plan created.", {
          stepId: activeStepId ?? null,
          failureType: request.type,
          plan,
        });
        if (memoryKey) {
          const summary = `Problem: ${request.type} · Countermeasure: ${plan.reason || "Applied recovery plan."}`;
          const memoryResult = await validateAndAddAgentLongTermMemory({
            memoryKey,
            runId,
            content: summary,
            summary,
            tags: ["problem-solution", request.type],
            metadata: {
              failureType: request.type,
              plan,
              url: request.url,
              stepId: activeStepId ?? null,
            },
            importance: 4,
            model: memoryValidationModel ?? resolvedModel,
            prompt: request.prompt,
          });
          if (memoryResult?.skipped) {
            await log("warning", "Long-term memory rejected.", {
              issues: memoryResult.validation.issues,
              reason: memoryResult.validation.reason,
              model: memoryResult.validation.model,
            });
          }
        }
        await prisma.agentAuditLog.create({
          data: {
            runId,
            level: "info",
            message: "LLM failure recovery plan created.",
            metadata: {
              failureType: request.type,
              plan,
              model: resolvedModel,
              stepId: activeStepId ?? null,
            },
          },
        });
        return plan;
      } catch (error) {
        await log("warning", "LLM failure recovery plan failed.", {
          stepId: activeStepId ?? null,
          failureType: request.type,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    };

    const findFirstVisible = async (locator: ReturnType<Page["locator"]>) => {
      const count = await locator.count();
      for (let i = 0; i < count; i += 1) {
        const candidate = locator.nth(i);
        if (await candidate.isVisible()) {
          return candidate;
        }
      }
      return null;
    };

    const inferLoginCandidates = async () => {
      if (!page) return null;
      try {
        const candidates = await page.evaluate(() => {
          const cssPath = (el: Element) => {
            if (!(el instanceof Element)) return null;
            if (el.id) {
              return `#${CSS.escape(el.id)}`;
            }
            const parts: string[] = [];
            let node: Element | null = el;
            while (node && node.nodeType === 1 && node !== document.documentElement) {
              let part = node.tagName.toLowerCase();
              const name = node.getAttribute("name");
              const dataTest =
                node.getAttribute("data-testid") ||
                node.getAttribute("data-test") ||
                node.getAttribute("data-qa");
              if (name) {
                part += `[name="${name.replace(/"/g, '\\"')}"]`;
              } else if (dataTest) {
                part += `[data-testid="${dataTest.replace(/"/g, '\\"')}"]`;
              }
              const parent = node.parentElement;
              if (parent) {
                const siblings = Array.from(parent.children).filter(
                  (child) => child.tagName === node!.tagName
                );
                if (siblings.length > 1) {
                  const index = siblings.indexOf(node) + 1;
                  part += `:nth-of-type(${index})`;
                }
              }
              parts.unshift(part);
              node = node.parentElement;
            }
            return parts.join(" > ");
          };

          const scoreInput = (el: HTMLInputElement) => {
            const attrs = [
              el.name,
              el.id,
              el.placeholder,
              el.getAttribute("aria-label"),
              el.getAttribute("autocomplete"),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            let score = 0;
            if (el.type === "email") score += 5;
            if (el.type === "password") score += 5;
            if (attrs.includes("email")) score += 4;
            if (attrs.includes("user") || attrs.includes("login")) score += 3;
            if (attrs.includes("password") || attrs.includes("pass")) score += 4;
            return score;
          };

          const describe = (el: Element) => ({
            tag: el.tagName.toLowerCase(),
            id: (el as HTMLElement).id || null,
            name: (el as HTMLInputElement).name || null,
            type: (el as HTMLInputElement).type || null,
            text: (el as HTMLElement).innerText?.trim().slice(0, 120) || null,
            placeholder: (el as HTMLInputElement).placeholder || null,
            ariaLabel: el.getAttribute("aria-label"),
            selector: cssPath(el),
          });

          const inputs = Array.from(
            document.querySelectorAll("input, textarea, select")
          )
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .map((el) => ({
              ...describe(el),
              score:
                el instanceof HTMLInputElement ? scoreInput(el) : 0,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);

          const buttons = Array.from(
            document.querySelectorAll("button, input[type='submit'], input[type='button']")
          )
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .map((el) => ({
              ...describe(el),
              score: /log in|login|sign in|submit|continue|zaloguj|zaloguj się/i.test(
                (el as HTMLElement).innerText || (el as HTMLInputElement).value || ""
              )
                ? 5
                : 1,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);

          return { inputs, buttons };
        });

        await log("info", "Inferred login candidates.", {
          stepId: activeStepId ?? null,
          candidates,
        });
        return candidates;
      } catch (error) {
        await log("warning", "Failed to infer login candidates.", {
          error: error instanceof Error ? error.message : String(error),
          stepId: activeStepId ?? null,
        });
      }
      return null;
    };

    const ensureLoginFormVisible = async () => {
      if (!page) return;
      const passwordSelector =
        'input[type="password"], input[name*="pass" i], input[autocomplete*="current-password" i]';
      const passwordField = await findFirstVisible(page.locator(passwordSelector));
      if (passwordField) return true;

      const loginTrigger = await findFirstVisible(
        page.locator(
          'a, button, [role="button"]'
        ).filter({
          hasText: /log in|login|sign in|zaloguj|zalogować|zaloguj się|inloggen|logga in|connexion|accedi/i,
        })
      );

      if (loginTrigger) {
        await loginTrigger.click();
        await log("info", "Clicked login trigger.");
        await captureSessionContext("after-login-trigger");
        try {
          await page.waitForSelector(passwordSelector, { timeout: 10000 });
        } catch {
          await log("warning", "Login form did not appear after clicking trigger.");
        }
        const postClickPassword = await findFirstVisible(page.locator(passwordSelector));
        if (postClickPassword) return true;
      }

      const currentUrl = page.url();
      try {
        const target = new URL(currentUrl);
        const loginUrl = `${target.origin}/login`;
        await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
        await log("info", "Navigated to fallback login URL.", { loginUrl });
        await captureSessionContext("after-login-fallback");
      } catch {
        await log("warning", "Failed to navigate to fallback login URL.");
      }
      const fallbackPassword = await findFirstVisible(page.locator(passwordSelector));
      if (fallbackPassword) return true;
      await log("warning", "Login form still not visible after fallback navigation.");
      return false;
    };

    const buildSearchQueryWithLLM = async () => {
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: resolvedModel,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "You craft concise web search queries. Return only JSON with keys: query, intent.",
              },
              {
                role: "user",
                content: JSON.stringify({ prompt }),
              },
            ],
            options: { temperature: 0.2 },
          }),
        });
        if (!response.ok) {
          throw new Error(`Search query inference failed (${response.status}).`);
        }
        const payload = await response.json();
        const content = payload?.message?.content || "";
        const match = content.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : JSON.parse(content);
        const query =
          typeof parsed?.query === "string" ? parsed.query.trim() : "";
        return query || null;
      } catch (error) {
        await log("warning", "LLM search query inference failed.", {
          stepId: activeStepId ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    };

    const fetchSearchResults = async (query: string) => {
      const provider = resolvedSearchProvider.toLowerCase();
      if (provider === "brave") {
        try {
          if (!BRAVE_SEARCH_API_KEY) {
            throw new Error("Brave search API key not configured.");
          }
          const url = new URL(BRAVE_SEARCH_API_URL);
          url.searchParams.set("q", query);
          url.searchParams.set("count", "6");
          const res = await fetch(url.toString(), {
            headers: {
              Accept: "application/json",
              "X-Subscription-Token": BRAVE_SEARCH_API_KEY,
            },
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Search failed (${res.status}).`);
          }
          const data = (await res.json()) as {
            web?: { results?: Array<{ title?: string; url?: string }> };
          };
          return (
            data.web?.results
              ?.map((item) => ({
                title: item.title || "Untitled",
                url: item.url || "",
              }))
              .filter((item) => item.url) || []
          );
        } catch (error) {
          await log("warning", "Brave search failed; falling back to DuckDuckGo.", {
            stepId: activeStepId ?? null,
            error: error instanceof Error ? error.message : String(error),
          });
          return await fetchDuckDuckGoResults(query);
        }
      }
      if (provider === "google") {
        try {
          if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
            throw new Error("Google search API key/engine not configured.");
          }
          const url = new URL(GOOGLE_SEARCH_API_URL);
          url.searchParams.set("key", GOOGLE_SEARCH_API_KEY);
          url.searchParams.set("cx", GOOGLE_SEARCH_ENGINE_ID);
          url.searchParams.set("q", query);
          url.searchParams.set("num", "6");
          const res = await fetch(url.toString());
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Search failed (${res.status}).`);
          }
          const data = (await res.json()) as {
            items?: Array<{ title?: string; link?: string }>;
          };
          return (
            data.items
              ?.map((item) => ({
                title: item.title || "Untitled",
                url: item.link || "",
              }))
              .filter((item) => item.url) || []
          );
        } catch (error) {
          await log("warning", "Google search failed; falling back to DuckDuckGo.", {
            stepId: activeStepId ?? null,
            error: error instanceof Error ? error.message : String(error),
          });
          return await fetchDuckDuckGoResults(query);
        }
      }
      if (provider === "serpapi") {
        try {
          if (!SERPAPI_API_KEY) {
            throw new Error("SerpApi key not configured.");
          }
          const url = new URL(SERPAPI_API_URL);
          url.searchParams.set("api_key", SERPAPI_API_KEY);
          url.searchParams.set("engine", "google");
          url.searchParams.set("q", query);
          url.searchParams.set("num", "6");
          const res = await fetch(url.toString());
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Search failed (${res.status}).`);
          }
          const data = (await res.json()) as {
            organic_results?: Array<{ title?: string; link?: string }>;
          };
          return (
            data.organic_results
              ?.map((item) => ({
                title: item.title || "Untitled",
                url: item.link || "",
              }))
              .filter((item) => item.url) || []
          );
        } catch (error) {
          await log("warning", "SerpApi search failed; falling back to DuckDuckGo.", {
            stepId: activeStepId ?? null,
            error: error instanceof Error ? error.message : String(error),
          });
          return await fetchDuckDuckGoResults(query);
        }
      }
      await log("warning", "Unsupported search provider; falling back to DuckDuckGo.", {
        stepId: activeStepId ?? null,
        provider,
      });
      return await fetchDuckDuckGoResults(query);
    };

    const fetchDuckDuckGoResults = async (query: string) => {
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`Search fetch failed (${response.status}).`);
      }
      const html = await response.text();
      const results: Array<{ title: string; url: string; snippet?: string }> = [];
      const resultRegex =
        /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
      let match: RegExpExecArray | null;
      while ((match = resultRegex.exec(html))) {
        const rawUrl = match[1];
        const title = match[2].replace(/<[^>]+>/g, "").trim();
        const url = rawUrl.includes("duckduckgo.com/l/")
          ? decodeURIComponent(
              new URL(rawUrl).searchParams.get("uddg") ?? rawUrl
            )
          : rawUrl;
        if (title && url) {
          results.push({ title, url });
        }
        if (results.length >= 6) break;
      }
      return results;
    };

    const pickSearchResultWithLLM = async (
      query: string,
      results: Array<{ title: string; url: string }>
    ) => {
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: resolvedModel,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "You select the best URL for the user task. Return only JSON with key: url.",
              },
              {
                role: "user",
                content: JSON.stringify({ query, prompt, results }),
              },
            ],
            options: { temperature: 0.2 },
          }),
        });
        if (!response.ok) {
          throw new Error(`Search result selection failed (${response.status}).`);
        }
        const payload = await response.json();
        const content = payload?.message?.content || "";
        const match = content.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : JSON.parse(content);
        const url = typeof parsed?.url === "string" ? parsed.url.trim() : "";
        return url || null;
      } catch (error) {
        await log("warning", "LLM search result selection failed.", {
          stepId: activeStepId ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    };

    const attemptSearchEscalation = async () => {
      const query = (await buildSearchQueryWithLLM()) ?? prompt ?? "";
      if (!query) return null;
      const results = await fetchSearchResults(query);
      if (results.length === 0) return null;
      const allowedResults = targetHostname
        ? results.filter((result) => isAllowedUrl(result.url, targetHostname))
        : results;
      if (targetHostname && allowedResults.length === 0) {
        await log("warning", "Search escalation returned no allowed results.", {
          stepId: activeStepId ?? null,
          query,
          targetHostname,
        });
        return null;
      }
      const picked = await pickSearchResultWithLLM(query, allowedResults);
      const resolvedPicked =
        picked && (!targetHostname || isAllowedUrl(picked, targetHostname))
          ? picked
          : null;
      if (picked && !resolvedPicked) {
        await log("warning", "Search escalation ignored disallowed URL.", {
          stepId: activeStepId ?? null,
          query,
          url: picked,
          targetHostname,
        });
      }
      const fallback = resolvedPicked || allowedResults[0]?.url;
      if (fallback) {
        await log("info", "Search escalation selected URL.", {
          stepId: activeStepId ?? null,
          query,
          url: fallback,
        });
      }
      return fallback ?? null;
    };

    const decideSearchFirstWithLLM = async () => {
      if (!prompt || hasExplicitUrl(prompt)) return null;
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: resolvedModel,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "You decide whether to use web search before direct navigation. Return only JSON with keys: useSearchFirst (boolean), reason, query.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  prompt,
                  inferredUrl: targetUrl,
                  hasExplicitUrl: hasExplicitUrl(prompt),
                }),
              },
            ],
            options: { temperature: 0.2 },
          }),
        });
        if (!response.ok) {
          throw new Error(`Tool selection failed (${response.status}).`);
        }
        const payload = await response.json();
        const content = payload?.message?.content || "";
        const match = content.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : JSON.parse(content);
        const useSearchFirst = Boolean(parsed?.useSearchFirst);
        const query = typeof parsed?.query === "string" ? parsed.query.trim() : "";
        await log("info", "Tool selection decision.", {
          stepId: activeStepId ?? null,
          decision: useSearchFirst ? "search-first" : "direct-navigation",
          reason: typeof parsed?.reason === "string" ? parsed.reason : null,
          query: query || null,
        });
        if (memoryKey && parsed?.reason) {
          const summary = `Problem: uncertain navigation target · Countermeasure: ${useSearchFirst ? "search-first" : "direct-navigation"} (${parsed.reason})`;
          const memoryResult = await validateAndAddAgentLongTermMemory({
            memoryKey,
            runId,
            content: summary,
            summary,
            tags: ["problem-solution", "tool-selection"],
            metadata: {
              decision: useSearchFirst ? "search-first" : "direct-navigation",
              reason: parsed.reason,
              query: query || null,
              inferredUrl: targetUrl,
            },
            importance: 3,
            model: memoryValidationModel ?? resolvedModel,
            prompt: prompt ?? null,
          });
          if (memoryResult?.skipped) {
            await log("warning", "Long-term memory rejected.", {
              issues: memoryResult.validation.issues,
              reason: memoryResult.validation.reason,
              model: memoryResult.validation.model,
            });
          }
        }
        await prisma.agentAuditLog.create({
          data: {
            runId,
            level: "info",
            message: "Tool selection decision.",
            metadata: {
              decision: useSearchFirst ? "search-first" : "direct-navigation",
              reason: typeof parsed?.reason === "string" ? parsed.reason : null,
              query: query || null,
              inferredUrl: targetUrl,
            },
          },
        });
        return { useSearchFirst, query: query || null };
      } catch (error) {
        await log("warning", "Tool selection decision failed.", {
          stepId: activeStepId ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    };

    let domText = "";
    let finalUrl = targetUrl;
    try {
      const searchFirstDecision = await decideSearchFirstWithLLM();
      let navigatedViaSearch = false;
      if (targetUrl !== "about:blank") {
        if (searchFirstDecision?.useSearchFirst) {
          const query = searchFirstDecision.query;
          const results = query ? await fetchSearchResults(query) : [];
          const allowedResults = targetHostname
            ? results.filter((result) => isAllowedUrl(result.url, targetHostname))
            : results;
          if (targetHostname && allowedResults.length === 0) {
            await log("warning", "Search-first returned no allowed results.", {
              stepId: activeStepId ?? null,
              query,
              targetHostname,
            });
          }
          const picked =
            query && allowedResults.length
              ? await pickSearchResultWithLLM(query, allowedResults)
              : null;
          const resolvedPicked =
            picked && (!targetHostname || isAllowedUrl(picked, targetHostname))
              ? picked
              : null;
          if (picked && !resolvedPicked) {
            await log("warning", "Search-first ignored disallowed URL.", {
              stepId: activeStepId ?? null,
              query,
              url: picked,
              targetHostname,
            });
          }
          const fallback =
            resolvedPicked || (allowedResults.length ? allowedResults[0]?.url : null);
          if (fallback) {
            if (!(await enforceRobotsPolicy(fallback))) {
              return { ok: false, error: "Blocked by robots.txt." };
            }
            await page.goto(fallback, {
              waitUntil: "domcontentloaded",
              timeout: 30000,
            });
            navigatedViaSearch = true;
          } else {
            await log("warning", "Search-first produced no results; falling back.", {
              stepId: activeStepId ?? null,
              query,
            });
          }
        }
        if (!navigatedViaSearch) {
          if (!(await enforceRobotsPolicy(targetUrl))) {
            return {
              ok: false,
              error: "Blocked by robots.txt.",
            };
          }
          try {
            await page.goto(targetUrl, {
              waitUntil: "domcontentloaded",
              timeout: 30000,
            });
          } catch (error) {
            await log("warning", "Direct navigation failed; attempting search.", {
              stepId: activeStepId ?? null,
              url: targetUrl,
              error: error instanceof Error ? error.message : String(error),
            });
            const searchUrl = await attemptSearchEscalation();
            if (searchUrl) {
              if (!(await enforceRobotsPolicy(searchUrl))) {
                return {
                  ok: false,
                  error: "Blocked by robots.txt.",
                };
              }
              await page.goto(searchUrl, {
                waitUntil: "domcontentloaded",
                timeout: 30000,
              });
            } else {
              throw error;
            }
          }
        }
      } else {
        const searchUrl = await attemptSearchEscalation();
        if (searchUrl) {
          if (!(await enforceRobotsPolicy(searchUrl))) {
            return {
              ok: false,
              error: "Blocked by robots.txt.",
            };
          }
          await page.goto(searchUrl, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
        } else {
          await page.setContent(
            `<html><head><title>Agent preview</title></head><body><h1>Agent browser</h1><p>${safeText(
              prompt
            )}</p></body></html>`
          );
        }
      }

      const initialSnapshot = await captureSnapshot(
        stepLabel ? `step-${stepLabel}` : "initial",
        stepId
      );
      domText = initialSnapshot.domText;
      finalUrl = initialSnapshot.url;
      await captureSessionContext("after-initial-navigation");
      await dismissConsent("after-initial-navigation");
      if (detectChallenge(domText) || detectChallenge(initialSnapshot.domHtml)) {
        await flagCloudflare("dom", "challenge markers in DOM/HTML");
      }
      if (cloudflareDetected) {
        return {
          ok: false,
          error: "Cloudflare challenge detected; requires human.",
        };
      }

      if (stepLabel) {
        const domSample = (
          await page.evaluate(
            () => document.body?.innerText || document.documentElement?.innerText || ""
          )
        ).slice(0, 2000);
        const uiInventory = await collectUiInventory(
          `selector-inference:${stepLabel}`,
          activeStepId ?? undefined
        );
        const taskDescription = `Action step: ${stepLabel}. User request: ${prompt ?? ""}`;
        await inferSelectorsFromLLM(
          uiInventory,
          domSample,
          taskDescription,
          "action-step"
        );
      }

      const extractionRequest = parseExtractionRequest(prompt);
      if (extractionRequest) {
        if (targetHostname && !isAllowedUrl(finalUrl, targetHostname)) {
          await log("warning", "Extraction blocked; navigated outside target domain.", {
            url: finalUrl,
            targetHostname,
            stepId: activeStepId ?? null,
          });
          await prisma.agentAuditLog.create({
            data: {
              runId,
              level: "warning",
              message: "Extraction blocked; navigated outside target domain.",
              metadata: {
                url: finalUrl,
                targetHostname,
              },
            },
          });
          return {
            ok: false,
            error: "Extraction blocked; navigated outside target domain.",
            output: {
              url: finalUrl,
              domText,
              extractedItems: [],
              extractedTotal: 0,
              extractionType: extractionRequest.type,
              extractionPlan: null,
            },
          };
        }
        const requiredCount = extractionRequest.count ?? 10;
        const domSample = (
          await page.evaluate(
            () => document.body?.innerText || document.documentElement?.innerText || ""
          )
        ).slice(0, 2000);
        const uiInventory = await collectUiInventory(
          "extraction-plan",
          activeStepId ?? undefined
        );
        const extractionPlan = await buildExtractionPlan({
          type: extractionRequest.type,
          domTextSample: domSample,
          uiInventory,
        });
        if (extractionRequest.type === "emails") {
          const rawText =
            domText ||
            (await page.evaluate(
              () => document.body?.innerText || document.documentElement?.innerText || ""
            ));
          const emailMatches = rawText.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
          );
          const extractedEmails = Array.from(
            new Set((emailMatches ?? []).map((item) => item.trim()))
          );
          const emailEvidence = buildEvidenceSnippets(extractedEmails, rawText);
          const emailValidation = await validateExtractionWithLLM({
            prompt: prompt ?? "",
            url: finalUrl,
            extractionType: "emails",
            requiredCount,
            items: extractedEmails,
            domTextSample: rawText.slice(0, 2000),
            targetHostname,
            evidence: emailEvidence,
          });
          if (!emailValidation.valid) {
            await prisma.agentAuditLog.create({
              data: {
                runId,
                level: "warning",
                message: "Extraction validation failed.",
                metadata: {
                  extractionType: "emails",
                  url: finalUrl,
                  requestedCount: requiredCount,
                  acceptedCount: emailValidation.acceptedItems.length,
                  rejectedItems: emailValidation.rejectedItems,
                  issues: emailValidation.issues,
                  evidence: emailValidation.evidence,
                },
              },
            });
            await log("warning", "Extraction validation failed.", {
              extractionType: "emails",
              url: finalUrl,
              requestedCount: requiredCount,
              acceptedCount: emailValidation.acceptedItems.length,
              rejectedItems: emailValidation.rejectedItems,
              issues: emailValidation.issues,
            });
            const normalizedEmails = await normalizeExtractionItemsWithLLM({
              prompt: prompt ?? "",
              extractionType: "emails",
              items: emailValidation.acceptedItems,
            });
            return {
              ok: false,
              error: "Extraction validation failed.",
              output: {
                url: finalUrl,
                domText: rawText,
                extractedItems: normalizedEmails,
                extractedTotal: normalizedEmails.length,
                extractionType: "emails",
                extractionPlan,
              },
            };
          }
          const validatedEmails = emailValidation.acceptedItems.length
            ? emailValidation.acceptedItems
            : extractedEmails;
          const normalizedEmails = await normalizeExtractionItemsWithLLM({
            prompt: prompt ?? "",
            extractionType: "emails",
            items: validatedEmails,
          });
          const extractedTotal = validatedEmails.length;
          const limitedEmails = normalizedEmails.slice(
            0,
            Math.max(requiredCount, 10)
          );
          await prisma.agentAuditLog.create({
            data: {
              runId,
              level: extractedTotal ? "info" : "warning",
              message: extractedTotal
                ? "Extracted emails."
                : "No emails extracted.",
              metadata: {
                requestedCount: requiredCount,
                extractedCount: extractedTotal,
                items: limitedEmails,
                extractionType: "emails",
                extractionPlan,
                url: finalUrl,
              },
            },
          });
          await log(
            extractedTotal ? "info" : "warning",
            extractedTotal ? "Extracted emails." : "No emails extracted.",
            {
              requestedCount: requiredCount,
              extractedCount: extractedTotal,
              items: limitedEmails,
              extractionType: "emails",
              extractionPlan,
              url: finalUrl,
            }
          );
          if (extractedTotal === 0) {
            const recoveryDomSample = (
              await page.evaluate(
                () => document.body?.innerText || document.documentElement?.innerText || ""
              )
            ).slice(0, 2000);
            const recoveryInventory = await collectUiInventory(
              "failure-recovery",
              activeStepId ?? undefined
            );
            const recoveryPlan = await buildFailureRecoveryPlan({
              type: "missing_extraction",
              prompt: prompt ?? "",
              url: finalUrl,
              domTextSample: recoveryDomSample,
              uiInventory: recoveryInventory,
              extractionPlan,
            });
            if (recoveryPlan?.clickSelector) {
              try {
                const clickTarget = page.locator(recoveryPlan.clickSelector).first();
                await clickTarget.click({ timeout: 4000 });
                await page.waitForTimeout(1500);
                await captureSnapshot("email-recovery-click", activeStepId ?? undefined);
              } catch (error) {
                await log("warning", "Email recovery click failed.", {
                  selector: recoveryPlan.clickSelector,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }
            if (recoveryPlan?.listingUrls?.length) {
              const recoveryUrls = targetHostname
                ? recoveryPlan.listingUrls.filter((url) =>
                    isAllowedUrl(url, targetHostname)
                  )
                : recoveryPlan.listingUrls;
              for (const url of recoveryUrls.slice(0, 3)) {
                try {
                  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
                  await dismissConsent("email-recovery-navigation");
                  await captureSnapshot("email-recovery-navigation", activeStepId ?? undefined);
                  const updatedText = await page.evaluate(
                    () => document.body?.innerText || document.documentElement?.innerText || ""
                  );
                  const updatedMatches = updatedText.match(
                    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
                  );
                  const updatedEmails = Array.from(
                    new Set((updatedMatches ?? []).map((item) => item.trim()))
                  );
                  if (updatedEmails.length > 0) {
                    return {
                      ok: true,
                      output: {
                        url: page.url(),
                        domText: updatedText,
                        extractedItems: updatedEmails.slice(
                          0,
                          Math.max(requiredCount, 10)
                        ),
                        extractedTotal: updatedEmails.length,
                        extractionType: "emails",
                        extractionPlan,
                      },
                    };
                  }
                } catch (error) {
                  await log("warning", "Email recovery navigation failed.", {
                    url,
                    error: error instanceof Error ? error.message : String(error),
                  });
                }
              }
            }
            return {
              ok: false,
              error: "No emails extracted.",
              output: {
                url: finalUrl,
                domText,
                extractedItems: [],
                extractedTotal: 0,
                extractionType: "emails",
                extractionPlan,
              },
            };
          }
          return {
            ok: true,
            output: {
              url: finalUrl,
              domText,
              extractedItems: limitedEmails,
              extractedTotal,
              extractionType: "emails",
              extractionPlan,
            },
          };
        }

        await waitForProductContent();
        const cleanProductNames = (items: string[]) => normalizeProductNames(items);
        let extractedNames = cleanProductNames(await extractProductNames());
        if (extractedNames.length === 0) {
          await log("warning", "No product names found on first pass; scrolling.", {
            url: finalUrl,
          });
          await autoScroll();
          const scrolledSnapshot = await captureSnapshot(
            "after-scroll",
            activeStepId ?? undefined
          );
          domText = scrolledSnapshot.domText;
          extractedNames = cleanProductNames(await extractProductNames());
        }
        if (extractedNames.length === 0) {
          const listingUrls = await findProductListingUrls();
          for (const url of listingUrls) {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
            await dismissConsent("after-listing-navigation");
            await waitForProductContent();
            const listingSnapshot = await captureSnapshot(
              "listing-navigation",
              activeStepId ?? undefined
            );
            domText = listingSnapshot.domText;
            finalUrl = listingSnapshot.url;
            extractedNames = cleanProductNames(await extractProductNames());
            if (extractedNames.length > 0) {
              await log("info", "Found product names after listing navigation.", {
                url,
                extractedCount: extractedNames.length,
                stepId: activeStepId ?? null,
              });
              break;
            }
          }
        }
        if (extractedNames.length === 0) {
          const domSample = (
            await page.evaluate(
              () => document.body?.innerText || document.documentElement?.innerText || ""
            )
          ).slice(0, 2000);
          const uiInventory = await collectUiInventory(
            "selector-inference",
            activeStepId ?? undefined
          );
          const inferredSelectors = await inferSelectorsFromLLM(
            uiInventory,
            domSample,
            "Extract product names from this page.",
            "product-extraction"
          );
          const planSelectors = extractionPlan?.primarySelectors ?? [];
          if (planSelectors.length > 0 && extractedNames.length === 0) {
            extractedNames = cleanProductNames(
              await extractProductNamesFromSelectors(planSelectors)
            );
          }
          if (inferredSelectors.length) {
            await log("info", "Trying inferred selectors for product extraction.", {
              selectors: inferredSelectors,
              stepId: activeStepId ?? null,
            });
            extractedNames = cleanProductNames(
              await extractProductNamesFromSelectors(inferredSelectors)
            );
          }
          if (
            extractedNames.length === 0 &&
            (extractionPlan?.fallbackSelectors ?? []).length > 0
          ) {
            extractedNames = cleanProductNames(
              await extractProductNamesFromSelectors(
                extractionPlan?.fallbackSelectors ?? []
              )
            );
          }
          if (extractedNames.length === 0) {
            const headingSelectors = [
              "h1",
              "h2",
              "h3",
              "[class*='title' i]",
              "[class*='name' i]",
              "[class*='heading' i]",
            ];
            extractedNames = cleanProductNames(
              await extractProductNamesFromSelectors(headingSelectors)
            );
          }
        }
        if (extractedNames.length === 0) {
          const recoveryDomSample = (
            await page.evaluate(
              () => document.body?.innerText || document.documentElement?.innerText || ""
            )
          ).slice(0, 2000);
          const recoveryInventory = await collectUiInventory(
            "failure-recovery",
            activeStepId ?? undefined
          );
          const recoveryType =
            (extractionPlan?.primarySelectors ?? []).length > 0 ||
            (extractionPlan?.fallbackSelectors ?? []).length > 0
              ? "bad_selectors"
              : "missing_extraction";
          const recoveryPlan = await buildFailureRecoveryPlan({
            type: recoveryType,
            prompt: prompt ?? "",
            url: finalUrl,
            domTextSample: recoveryDomSample,
            uiInventory: recoveryInventory,
            extractionPlan,
          });
          if (recoveryPlan?.clickSelector) {
            try {
              const clickTarget = page.locator(recoveryPlan.clickSelector).first();
              await clickTarget.click({ timeout: 4000 });
              await page.waitForTimeout(1500);
              const clickSnapshot = await captureSnapshot(
                "product-recovery-click",
                activeStepId ?? undefined
              );
              domText = clickSnapshot.domText;
              finalUrl = clickSnapshot.url;
            } catch (error) {
              await log("warning", "Product recovery click failed.", {
                selector: recoveryPlan.clickSelector,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
          if (recoveryPlan?.selectors?.length) {
            extractedNames = cleanProductNames(
              await extractProductNamesFromSelectors(recoveryPlan.selectors)
            );
          }
          if (extractedNames.length === 0 && recoveryPlan?.listingUrls?.length) {
            const recoveryUrls = targetHostname
              ? recoveryPlan.listingUrls.filter((url) =>
                  isAllowedUrl(url, targetHostname)
                )
              : recoveryPlan.listingUrls;
            for (const url of recoveryUrls.slice(0, 3)) {
              try {
                await page.goto(url, {
                  waitUntil: "domcontentloaded",
                  timeout: 25000,
                });
                await dismissConsent("product-recovery-navigation");
                await waitForProductContent();
                const listingSnapshot = await captureSnapshot(
                  "product-recovery-navigation",
                  activeStepId ?? undefined
                );
                domText = listingSnapshot.domText;
                finalUrl = listingSnapshot.url;
                extractedNames = cleanProductNames(await extractProductNames());
                if (extractedNames.length > 0) break;
              } catch (error) {
                await log("warning", "Product recovery navigation failed.", {
                  url,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }
          }
        }
        const productDomText =
          domText ||
          (await page.evaluate(
            () => document.body?.innerText || document.documentElement?.innerText || ""
          ));
        const productEvidence = buildEvidenceSnippets(extractedNames, productDomText);
        const productValidation = await validateExtractionWithLLM({
          prompt: prompt ?? "",
          url: finalUrl,
          extractionType: "product_names",
          requiredCount,
          items: extractedNames,
          domTextSample: productDomText.slice(0, 2000),
          targetHostname,
          evidence: productEvidence,
        });
        if (!productValidation.valid) {
          await prisma.agentAuditLog.create({
            data: {
              runId,
              level: "warning",
              message: "Extraction validation failed.",
              metadata: {
                extractionType: "product_names",
                url: finalUrl,
                requestedCount: requiredCount,
                acceptedCount: productValidation.acceptedItems.length,
                rejectedItems: productValidation.rejectedItems,
                issues: productValidation.issues,
                evidence: productValidation.evidence,
                extractionPlan,
              },
            },
          });
          await log("warning", "Extraction validation failed.", {
            extractionType: "product_names",
            url: finalUrl,
            requestedCount: requiredCount,
            acceptedCount: productValidation.acceptedItems.length,
            rejectedItems: productValidation.rejectedItems,
            issues: productValidation.issues,
          });
          const normalizedNames = await normalizeExtractionItemsWithLLM({
            prompt: prompt ?? "",
            extractionType: "product_names",
            items: productValidation.acceptedItems,
          });
          return {
            ok: false,
            error: "Extraction validation failed.",
            output: {
              url: finalUrl,
              domText,
              extractedNames: normalizedNames,
              extractedItems: normalizedNames,
              extractedTotal: normalizedNames.length,
              extractionType: "product_names",
              extractionPlan,
            },
          };
        }
        const validatedNames = productValidation.acceptedItems.length
          ? productValidation.acceptedItems
          : extractedNames;
        const normalizedNames = await normalizeExtractionItemsWithLLM({
          prompt: prompt ?? "",
          extractionType: "product_names",
          items: validatedNames,
        });
        const extractedTotal = validatedNames.length;
        const limitedNames = normalizedNames.slice(0, Math.max(requiredCount, 10));
        await prisma.agentAuditLog.create({
          data: {
            runId,
            level: extractedTotal ? "info" : "warning",
            message: extractedTotal
              ? "Extracted product names."
              : "No product names extracted.",
            metadata: {
              requestedCount: requiredCount,
              extractedCount: extractedTotal,
              names: limitedNames,
              items: limitedNames,
              extractionType: "product_names",
              extractionPlan,
              url: finalUrl,
            },
          },
        });
        await log(
          extractedTotal ? "info" : "warning",
          extractedTotal ? "Extracted product names." : "No product names extracted.",
          {
            requestedCount: requiredCount,
            extractedCount: extractedTotal,
            names: limitedNames,
            items: limitedNames,
            extractionType: "product_names",
            extractionPlan,
            url: finalUrl,
          }
        );
        if (extractedTotal === 0) {
          return {
            ok: false,
            error: "No product names extracted.",
            output: {
              url: finalUrl,
              domText,
              extractedNames: [],
              extractedItems: [],
              extractedTotal: 0,
              extractionType: "product_names",
              extractionPlan,
            },
          };
        }
        return {
          ok: true,
          output: {
            url: finalUrl,
            domText,
            extractedNames: limitedNames,
            extractedItems: limitedNames,
            extractedTotal,
            extractionType: "product_names",
            extractionPlan,
          },
        };
      }

      const credentials = parseCredentials(prompt);
      if (credentials) {
        let loginFormVisible = false;
        let submitPerformed = false;
        let usernameFilled = false;
        let passwordFilled = false;
        let recoveryPlan:
          | {
              reason: string | null;
              selectors: string[];
              listingUrls: string[];
              clickSelector: string | null;
              loginUrl: string | null;
              usernameSelector: string | null;
              passwordSelector: string | null;
              submitSelector: string | null;
              notes: string | null;
            }
          | null = null;
        await log("info", "Detected login credentials.", {
          email: credentials.email ? "[redacted]" : null,
          username: credentials.username ? "[redacted]" : null,
        });
        loginFormVisible = await ensureLoginFormVisible();
        await checkForChallenge("dom-after-login");
        if (cloudflareDetected) {
          return {
            ok: false,
            error: "Cloudflare challenge detected; requires human.",
          };
        }
        if (!loginFormVisible) {
          const recoveryDomSample = (
            await page.evaluate(
              () => document.body?.innerText || document.documentElement?.innerText || ""
            )
          ).slice(0, 2000);
          const recoveryInventory = await collectUiInventory(
            "login-failure-recovery",
            activeStepId ?? undefined
          );
          const loginCandidates = await inferLoginCandidates();
          recoveryPlan = await buildFailureRecoveryPlan({
            type: "login_stuck",
            prompt: prompt ?? "",
            url: page.url(),
            domTextSample: recoveryDomSample,
            uiInventory: recoveryInventory,
            loginCandidates,
          });
          if (recoveryPlan?.loginUrl) {
            try {
              await page.goto(recoveryPlan.loginUrl, {
                waitUntil: "domcontentloaded",
                timeout: 20000,
              });
              await captureSessionContext("login-recovery-url");
            } catch (error) {
              await log("warning", "Login recovery URL navigation failed.", {
                url: recoveryPlan.loginUrl,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
          if (recoveryPlan?.clickSelector) {
            try {
              const clickTarget = page.locator(recoveryPlan.clickSelector).first();
              await clickTarget.click({ timeout: 4000 });
              await page.waitForTimeout(1500);
              await captureSessionContext("login-recovery-click");
            } catch (error) {
              await log("warning", "Login recovery click failed.", {
                selector: recoveryPlan.clickSelector,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
          loginFormVisible = await ensureLoginFormVisible();
          if (!loginFormVisible) {
            await log("error", "Login form not visible after attempting to open.", {
              stepId: activeStepId ?? null,
            });
            return {
              ok: false,
              error: "Login form not visible after attempting to open.",
            };
          }
        }
        const locateBySelector = async (selector: string | null) => {
          if (!selector) return null;
          try {
            return await findFirstVisible(page.locator(selector));
          } catch {
            return null;
          }
        };
        const loginCandidates = await inferLoginCandidates();
        const emailInput = await findFirstVisible(
          page.locator(
            'input[type="email"], input[name*="email" i], input[autocomplete*="email" i]'
          )
        );
        let usernameInput =
          emailInput ??
          (await findFirstVisible(
            page.locator(
              'input[name*="user" i], input[name*="login" i], input[autocomplete*="username" i], input[type="text"]'
            )
          ));
        let passwordInput = await findFirstVisible(
          page.locator(
            'input[type="password"], input[name*="pass" i], input[autocomplete*="current-password" i]'
          )
        );
        if (!usernameInput || !passwordInput) {
          if (!recoveryPlan) {
            const recoveryDomSample = (
              await page.evaluate(
                () =>
                  document.body?.innerText || document.documentElement?.innerText || ""
              )
            ).slice(0, 2000);
            const recoveryInventory = await collectUiInventory(
              "login-field-recovery",
              activeStepId ?? undefined
            );
            recoveryPlan = await buildFailureRecoveryPlan({
              type: "login_stuck",
              prompt: prompt ?? "",
              url: page.url(),
              domTextSample: recoveryDomSample,
              uiInventory: recoveryInventory,
              loginCandidates,
            });
          }
          if (!usernameInput && recoveryPlan?.usernameSelector) {
            usernameInput = await locateBySelector(recoveryPlan.usernameSelector);
          }
          if (!passwordInput && recoveryPlan?.passwordSelector) {
            passwordInput = await locateBySelector(recoveryPlan.passwordSelector);
          }
        }

        if (usernameInput && (credentials.email || credentials.username)) {
          const value = credentials.email ?? credentials.username ?? "";
          await usernameInput.fill(value);
          usernameFilled = true;
          await log("info", "Filled username/email field.");
        } else {
          await log("warning", "No visible username/email field found.");
        }

        if (passwordInput) {
          await passwordInput.fill(credentials.password);
          passwordFilled = true;
          await log("info", "Filled password field.");
        } else {
          await log("warning", "No visible password field found.");
        }

        let submitButton = await findFirstVisible(
          page.locator(
            'button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Continue")'
          )
        );
        if (!submitButton && recoveryPlan?.submitSelector) {
          submitButton = await locateBySelector(recoveryPlan.submitSelector);
        }
        if (submitButton) {
          await submitButton.click();
          submitPerformed = true;
          await log("info", "Submitted login form.");
        } else if (passwordInput) {
          await passwordInput.press("Enter");
          submitPerformed = true;
          await log("info", "Submitted login form with Enter.");
        } else {
          await log("warning", "No submit action performed.");
        }
        await log("info", "Login attempt summary.", {
          loginFormVisible,
          usernameFilled,
          passwordFilled,
          submitPerformed,
          stepId: activeStepId ?? null,
        });
        if (!usernameFilled && !passwordFilled) {
          return {
            ok: false,
            error: "Login fields not detected on the page.",
          };
        }
        if (!submitPerformed) {
          return {
            ok: false,
            error: "No submit action performed for login.",
          };
        }
        await captureSessionContext("after-login-submit");

        try {
          await Promise.race([
            page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }),
            page.waitForTimeout(5000),
          ]);
        } catch {
          await log("warning", "Post-submit wait timed out.");
        }

        const postSnapshot = await captureSnapshot(
          stepLabel ? `step-${stepLabel}-after` : "after-login",
          stepId
        );
        domText = postSnapshot.domText;
        finalUrl = postSnapshot.url;
      } else {
        await log("info", "No credentials found in prompt. Navigation only.");
      }
    } finally {
      if (context) {
        await context.close();
      }
      if (launch) {
        await launch.close();
      }
      try {
        if (page?.video()) {
          const rawPath = await page.video()!.path();
          if (rawPath) {
            const recordingFile = "recording.webm";
            const targetPath = path.join(runDir, recordingFile);
            await fs.copyFile(rawPath, targetPath);
            await fs.unlink(rawPath).catch(() => undefined);
            videoPath = recordingFile;
          }
        }
      } catch (recordError) {
        if (debugEnabled) {
          console.error("[chatbot][agent][tool] Video capture failed", {
            runId,
            recordError,
          });
        }
      }
      if (videoPath) {
        try {
          await prisma.chatbotAgentRun.update({
            where: { id: runId },
            data: { recordingPath: videoPath },
          });
        } catch (updateError) {
          if (debugEnabled) {
            console.error("[chatbot][agent][tool] Recording update failed", {
              runId,
              updateError,
            });
          }
        }
      }
    }

    let latestSnapshotId: string | null = null;
    let logCount: number | null = null;
    try {
      if (stepId) {
        const latest = await prisma.agentBrowserSnapshot.findFirst({
          where: { runId, stepId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        latestSnapshotId = latest?.id ?? null;
      } else {
        const latest = await prisma.agentBrowserSnapshot.findFirst({
          where: { runId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        latestSnapshotId = latest?.id ?? null;
      }
      logCount = await prisma.agentBrowserLog.count({ where: { runId } });
    } catch {
      // ignore lookup failures
    }

    return {
      ok: true,
      output: {
        url: finalUrl,
        domText,
        snapshotId: latestSnapshotId,
        logCount,
      },
    };
  } catch (error) {
    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : "Tool failed.";
    if (debugEnabled) {
      console.error("[chatbot][agent][tool] Failed", { runId, errorId, error });
    }
    try {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          level: "error",
          message,
          metadata: { errorId },
        },
      });
    } catch {
      // ignore logging failures
    }
    return {
      ok: false,
      error: message,
      errorId,
    };
  }
}

export async function runAgentBrowserControl({
  runId,
  action,
  url,
  stepId,
  stepLabel,
}: {
  runId: string;
  action: AgentControlAction;
  url?: string;
  stepId?: string;
  stepLabel?: string;
}): Promise<AgentToolResult> {
  const debugEnabled = process.env.DEBUG_CHATBOT === "true";
  if (!("agentBrowserLog" in prisma) || !("agentBrowserSnapshot" in prisma)) {
    return {
      ok: false,
      error: "Agent browser tables not initialized. Run prisma generate/db push.",
    };
  }

  let launch: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const run = await prisma.chatbotAgentRun.findUnique({ where: { id: runId } });
    if (!run) {
      return { ok: false, error: "Agent run not found." };
    }

    const browserType =
      run.agentBrowser === "firefox"
        ? firefox
        : run.agentBrowser === "webkit"
          ? webkit
          : chromium;

    const runDir = path.join(process.cwd(), "tmp", "chatbot-agent", runId);
    await fs.mkdir(runDir, { recursive: true });

    const activeStepId = stepId ?? null;
    const log = async (
      level: string,
      message: string,
      metadata?: Record<string, unknown>
    ) => {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          stepId: activeStepId,
          level,
          message,
          metadata,
        },
      });
    };

    const captureSessionContext = async (label: string) => {
      if (!page || !context) return;
      try {
        const cookies = await context.cookies();
        const cookieSummary = cookies.map((cookie) => ({
          name: cookie.name,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          valueLength: cookie.value?.length ?? 0,
        }));

        const storageSummary = await page.evaluate(() => {
          const localKeys = Object.keys(localStorage ?? {});
          const sessionKeys = Object.keys(sessionStorage ?? {});
          return {
            localKeys,
            sessionKeys,
            localCount: localKeys.length,
            sessionCount: sessionKeys.length,
          };
        });

        await prisma.agentAuditLog.create({
          data: {
            runId,
            level: "info",
            message: "Captured session context.",
            metadata: {
              label,
              url: page.url(),
              title: await page.title(),
              cookies: cookieSummary,
              storage: storageSummary,
              stepId: activeStepId ?? null,
            },
          },
        });
        await log("info", "Captured session context.", {
          label,
          url: page.url(),
          title: await page.title(),
          cookies: cookieSummary,
          storage: storageSummary,
          stepId: activeStepId ?? null,
        });
      } catch (error) {
        await log("warning", "Failed to capture session context.", {
          label,
          error: error instanceof Error ? error.message : String(error),
          stepId: activeStepId ?? null,
        });
      }
    };

    const collectUiInventory = async (label: string) => {
      if (!page) return null;
      try {
        const uiInventory = await page.evaluate(() => {
          const normalizeText = (value: string | null | undefined) => {
            if (!value) return null;
            const trimmed = value.replace(/\s+/g, " ").trim();
            return trimmed || null;
          };
          const limit = 250;
          const describe = (el: Element) => {
            const tag = el.tagName.toLowerCase();
            const ariaLabel = el.getAttribute("aria-label");
            const name = el.getAttribute("name");
            const type = (el as HTMLInputElement).type || null;
            const placeholder = (el as HTMLInputElement).placeholder || null;
            const text = normalizeText((el as HTMLElement).innerText);
            const href = (el as HTMLAnchorElement).href || null;
            const role = el.getAttribute("role");
            return {
              id: el.id || null,
              tag,
              href,
              name,
              role,
              text,
              type,
              selector: el.tagName ? el.tagName.toLowerCase() : null,
              ariaLabel,
              placeholder,
            };
          };
          const collect = (selector: string) =>
            Array.from(document.querySelectorAll(selector))
              .slice(0, limit)
              .map(describe);
          return {
            url: location.href,
            forms: collect("form"),
            links: collect("a[href]"),
            title: document.title,
            counts: {
              forms: document.querySelectorAll("form").length,
              links: document.querySelectorAll("a[href]").length,
              inputs: document.querySelectorAll("input, textarea, select").length,
              buttons: document.querySelectorAll("button, [role='button']").length,
              headings: document.querySelectorAll("h1, h2, h3, h4, h5, h6")
                .length,
            },
            inputs: collect("input, textarea, select"),
            buttons: collect("button, [role='button']"),
            headings: collect("h1, h2, h3, h4, h5, h6"),
            truncated: {
              forms: document.querySelectorAll("form").length > limit,
              links: document.querySelectorAll("a[href]").length > limit,
              inputs:
                document.querySelectorAll("input, textarea, select").length >
                limit,
              buttons:
                document.querySelectorAll("button, [role='button']").length >
                limit,
              headings:
                document.querySelectorAll("h1, h2, h3, h4, h5, h6").length >
                limit,
            },
          };
        });

        await log("info", "Captured UI inventory.", {
          label,
          stepId: activeStepId ?? null,
          uiInventory,
        });
        await prisma.agentAuditLog.create({
          data: {
            runId,
            level: "info",
            message: "Captured UI inventory.",
            metadata: {
              label,
              stepId: activeStepId ?? null,
              uiInventory,
            },
          },
        });
        return uiInventory;
      } catch (error) {
        await log("warning", "Failed to capture UI inventory.", {
          label,
          stepId: activeStepId ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    };

    const latestSnapshot = await prisma.agentBrowserSnapshot.findFirst({
      where: { runId },
      orderBy: { createdAt: "desc" },
    });

    const fallbackUrl = extractTargetUrl(run.prompt) ?? null;
    const latestUrl =
      latestSnapshot?.url && latestSnapshot.url !== "about:blank"
        ? latestSnapshot.url
        : null;
    const targetUrl =
      action === "goto" && url?.trim()
        ? url.trim()
        : latestUrl ?? fallbackUrl;

    if (!targetUrl && action !== "snapshot") {
      return { ok: false, error: "No target URL available for control action." };
    }

    launch = await browserType.launch({
      headless: run.runHeadless ?? true,
    });
    context = await launch.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();

    await log("info", "Agent control action started.", {
      action,
      url: targetUrl,
      browser: run.agentBrowser || "chromium",
    });

    if (targetUrl) {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (action === "reload") {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
      }
    } else {
      await page.setContent(
        `<html><head><title>Agent preview</title></head><body><h1>No target URL</h1></body></html>`
      );
    }

    const domHtml = await page.content();
    const domText = await page.evaluate(
      () => document.body?.innerText || document.documentElement?.innerText || ""
    );
    const title = await page.title();
    const snapshotUrl = page.url();
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const safeLabel = stepLabel
      ? `step-${stepLabel}`.replace(/[^a-z0-9-_]/gi, "_").toLowerCase()
      : `control-${action}`;
    const screenshotFile = `snapshot-${Date.now()}-${safeLabel}.png`;
    const screenshotPath = path.join(runDir, screenshotFile);
    await fs.writeFile(screenshotPath, screenshotBuffer);
    const viewport = page.viewportSize();

    const createdSnapshot = await prisma.agentBrowserSnapshot.create({
      data: {
        runId,
        url: snapshotUrl,
        title,
        domHtml,
        domText,
        screenshotData: toDataUrl(screenshotBuffer),
        screenshotPath: screenshotFile,
        stepId: stepId ?? null,
        mouseX: null,
        mouseY: null,
        viewportWidth: viewport?.width ?? null,
        viewportHeight: viewport?.height ?? null,
      },
    });

    await log("info", "Agent control snapshot captured.", {
      action,
      url: snapshotUrl,
      screenshotFile,
      stepId: stepId ?? null,
    });
    await collectUiInventory(safeLabel);
    await captureSessionContext(safeLabel);

    const logCount = await prisma.agentBrowserLog.count({ where: { runId } });
    return {
      ok: true,
      output: {
        url: snapshotUrl,
        snapshotId: createdSnapshot.id,
        logCount,
      },
    };
  } catch (error) {
    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : "Control action failed.";
    if (debugEnabled) {
      console.error("[chatbot][agent][control] Failed", { runId, errorId, error });
    }
    try {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          level: "error",
          message,
          metadata: { errorId },
        },
      });
    } catch {
      // ignore logging failures
    }
    return { ok: false, error: message, errorId };
  } finally {
    if (context) {
      await context.close();
    }
    if (launch) {
      await launch.close();
    }
  }
}
