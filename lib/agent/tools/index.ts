import prisma from "@/lib/prisma";
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
  if (/task type:\s*web_task/i.test(prompt)) return null;
  const taskTypeHint = /task type:\s*extract_info/i.test(prompt);
  const wantsExtraction =
    taskTypeHint ||
    /(extract|collect|find|list|get)\b/i.test(prompt);
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

const toDataUrl = (buffer: Buffer) =>
  `data:image/png;base64,${buffer.toString("base64")}`;

const safeText = (value: string | null | undefined) => value ?? "";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3-vl:30b";

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
    const runRecord =
      "chatbotAgentRun" in prisma
        ? await prisma.chatbotAgentRun.findUnique({
            where: { id: runId },
            select: { model: true },
          })
        : null;
    const resolvedModel = runRecord?.model || DEFAULT_OLLAMA_MODEL;
    const browserType =
      browser === "firefox" ? firefox : browser === "webkit" ? webkit : chromium;

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
            model: resolvedModel,
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
            model: resolvedModel,
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

    let domText = "";
    let finalUrl = targetUrl;
    try {
      if (targetUrl !== "about:blank") {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      } else {
        await page.setContent(
          `<html><head><title>Agent preview</title></head><body><h1>Agent browser</h1><p>${safeText(
            prompt
          )}</p></body></html>`
        );
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
          const extractedTotal = extractedEmails.length;
          const limitedEmails = extractedEmails.slice(
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
        let extractedNames = await extractProductNames();
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
          extractedNames = await extractProductNames();
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
            extractedNames = await extractProductNames();
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
            extractedNames = await extractProductNamesFromSelectors(planSelectors);
          }
          if (inferredSelectors.length) {
            await log("info", "Trying inferred selectors for product extraction.", {
              selectors: inferredSelectors,
              stepId: activeStepId ?? null,
            });
            extractedNames = await extractProductNamesFromSelectors(inferredSelectors);
          }
          if (
            extractedNames.length === 0 &&
            (extractionPlan?.fallbackSelectors ?? []).length > 0
          ) {
            extractedNames = await extractProductNamesFromSelectors(
              extractionPlan?.fallbackSelectors ?? []
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
            extractedNames = await extractProductNamesFromSelectors(headingSelectors);
          }
        }
        const extractedTotal = extractedNames.length;
        const limitedNames = extractedNames.slice(0, Math.max(requiredCount, 10));
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
          await log("error", "Login form not visible after attempting to open.", {
            stepId: activeStepId ?? null,
          });
          return {
            ok: false,
            error: "Login form not visible after attempting to open.",
          };
        }
        await inferLoginCandidates();
        const emailInput = await findFirstVisible(
          page.locator(
            'input[type="email"], input[name*="email" i], input[autocomplete*="email" i]'
          )
        );
        const usernameInput =
          emailInput ??
          (await findFirstVisible(
            page.locator(
              'input[name*="user" i], input[name*="login" i], input[autocomplete*="username" i], input[type="text"]'
            )
          ));
        const passwordInput = await findFirstVisible(
          page.locator(
            'input[type="password"], input[name*="pass" i], input[autocomplete*="current-password" i]'
          )
        );

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

        const submitButton = await findFirstVisible(
          page.locator(
            'button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Continue")'
          )
        );
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
