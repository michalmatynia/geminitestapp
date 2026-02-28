export type PlaywrightScriptTemplate = {
  id: string;
  name: string;
  description: string;
  script: string;
};

export const PLAYWRIGHT_SCRIPT_TEMPLATES: PlaywrightScriptTemplate[] = [
  {
    id: 'title-extract',
    name: 'Title Extractor',
    description: 'Open the target URL and emit title + resolved URL.',
    script:
      'export default async function run({ page, input, emit }) {\n' +
      '  const target = input?.prompt || input?.value || input?.result || "https://example.com";\n' +
      '  const url = typeof target === "string" && target.trim() ? target.trim() : "https://example.com";\n' +
      '  await page.goto(url, { waitUntil: "domcontentloaded" });\n' +
      '  const title = await page.title();\n' +
      '  emit("result", title);\n' +
      '  emit("value", { title, url: page.url() });\n' +
      '  return { title, url: page.url() };\n' +
      '}',
  },
  {
    id: 'link-crawler',
    name: 'Link Crawler',
    description: 'Collect unique first-party links from a page and emit top results.',
    script:
      'export default async function run({ page, input, emit, log }) {\n' +
      '  const target = input?.prompt || input?.value || input?.result || "https://example.com";\n' +
      '  const url = typeof target === "string" && target.trim() ? target.trim() : "https://example.com";\n' +
      '  await page.goto(url, { waitUntil: "domcontentloaded" });\n' +
      '  const origin = new URL(page.url()).origin;\n' +
      '  const links = await page.$$eval("a[href]", (nodes) =>\n' +
      '    nodes\n' +
      '      .map((node) => node.getAttribute("href") || "")\n' +
      '      .filter((href) => Boolean(href))\n' +
      '  );\n' +
      '  const normalized = Array.from(\n' +
      '    new Set(\n' +
      '      links\n' +
      '        .map((href) => {\n' +
      '          try {\n' +
      '            return new URL(href, origin).toString();\n' +
      '          } catch {\n' +
      '            return null;\n' +
      '          }\n' +
      '        })\n' +
      '        .filter((href) => typeof href === "string" && href.startsWith(origin))\n' +
      '    )\n' +
      '  ).slice(0, 50);\n' +
      '  log("Collected links", normalized.length);\n' +
      '  emit("result", normalized);\n' +
      '  return { baseUrl: page.url(), linkCount: normalized.length, links: normalized };\n' +
      '}',
  },
  {
    id: 'form-fill',
    name: 'Form Fill + Submit',
    description: 'Populate a simple form, submit it, and emit status + final URL.',
    script:
      'export default async function run({ page, input, emit }) {\n' +
      '  const target = input?.prompt || "https://example.com/contact";\n' +
      '  const payload = typeof input?.bundle === "object" && input?.bundle ? input.bundle : {};\n' +
      '  await page.goto(String(target), { waitUntil: "domcontentloaded" });\n' +
      '  if (payload.name) await page.fill("input[name=name]", String(payload.name));\n' +
      '  if (payload.email) await page.fill("input[name=email]", String(payload.email));\n' +
      '  if (payload.message) await page.fill("textarea[name=message]", String(payload.message));\n' +
      '  await Promise.all([\n' +
      '    page.waitForLoadState("networkidle").catch(() => undefined),\n' +
      '    page.click("button[type=submit]"),\n' +
      '  ]);\n' +
      '  const finalUrl = page.url();\n' +
      '  const title = await page.title();\n' +
      '  const result = { ok: true, finalUrl, title };\n' +
      '  emit("result", result);\n' +
      '  return result;\n' +
      '}',
  },
  {
    id: 'visual-audit',
    name: 'Visual Audit',
    description: 'Capture screenshot/html artifacts and return basic page diagnostics.',
    script:
      'export default async function run({ page, input, artifacts, emit }) {\n' +
      '  const target = input?.prompt || input?.value || "https://example.com";\n' +
      '  const url = typeof target === "string" && target.trim() ? target.trim() : "https://example.com";\n' +
      '  await page.goto(url, { waitUntil: "networkidle" });\n' +
      '  const screenshot = await artifacts.screenshot("audit");\n' +
      '  const html = await artifacts.html("audit");\n' +
      '  const result = {\n' +
      '    url: page.url(),\n' +
      '    title: await page.title(),\n' +
      '    screenshot,\n' +
      '    html,\n' +
      '  };\n' +
      '  emit("result", result);\n' +
      '  return result;\n' +
      '}',
  },
];

export const CUSTOM_PLAYWRIGHT_SCRIPT_TEMPLATE = '__custom__';

export const findPlaywrightScriptTemplate = (templateId: string): PlaywrightScriptTemplate | null =>
  PLAYWRIGHT_SCRIPT_TEMPLATES.find((template) => template.id === templateId) ?? null;

export const findPlaywrightTemplateByScript = (
  script: string | undefined
): PlaywrightScriptTemplate | null => {
  const normalized = script?.trim() ?? '';
  if (!normalized) return null;
  return (
    PLAYWRIGHT_SCRIPT_TEMPLATES.find((template) => template.script.trim() === normalized) ?? null
  );
};
