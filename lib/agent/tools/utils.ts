import { promises as fs } from "fs";
import path from "path";

export const toDataUrl = (buffer: Buffer) =>
  `data:image/png;base64,${buffer.toString("base64")}`;

export const safeText = (value: string | null | undefined) => value ?? "";

export const extractTargetUrl = (prompt?: string) => {
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

export const hasExplicitUrl = (prompt?: string) =>
  Boolean(prompt?.match(/https?:\/\/[^\s)]+/i));

export const getTargetHostname = (prompt?: string) => {
  const url = extractTargetUrl(prompt);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
};

export const isAllowedUrl = (url: string, targetHostname: string | null) => {
  if (!targetHostname) return true;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    return hostname === targetHostname || hostname.endsWith(`.${targetHostname}`);
  } catch {
    return false;
  }
};

export const normalizeProductNames = (items: string[]) => {
  const seen = new Set<string>();
  const uiNoise =
    /^(add to cart|quick view|view details|view product|choose options|select options|in stock|out of stock|sold out|sale|new|buy now|learn more|load more|show more|filters?|sort by)$/i;
  return items
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((item) => /[a-z]/i.test(item))
    .filter((item) => !/^[a-f0-9]{16,}$/i.test(item))
    .filter((item) => !/^[a-f0-9]{32,}$/i.test(item))
    .filter((item) => !/^\$?\d+(?:\.\d+)?$/.test(item))
    .filter((item) => !uiNoise.test(item))
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const normalizeEmailCandidates = (items: string[]) => {
  const seen = new Set<string>();
  const cleaned = items
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item) => /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(item));
  return cleaned.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
};

export const loadRobotsTxt = async (url: string) => {
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

export const parseRobotsRules = (robotsTxt: string) => {
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
        list.push({ type: key, path: value });
        rules.set(agent, list);
      }
    }
  }
  return rules;
};

export const evaluateRobotsRules = (
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

export const parseCredentials = (prompt?: string) => {
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

export const parseExtractionRequest = (prompt?: string) => {
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

export const buildEvidenceSnippets = (items: string[], domText: string) => {
  const evidence: Array<{ item: string; snippet: string }> = [];
  if (!domText) return evidence;
  const lowerText = domText.toLowerCase();
  for (const item of items) {
    const query = item.trim().toLowerCase();
    if (!query) continue;
    let index = lowerText.indexOf(query);
    let occurrences = 0;
    while (index !== -1 && occurrences < 2) {
      const start = Math.max(0, index - 60);
      const end = Math.min(domText.length, index + query.length + 60);
      evidence.push({ item, snippet: domText.slice(start, end) });
      occurrences += 1;
      index = lowerText.indexOf(query, index + query.length);
    }
  }
  return evidence;
};
