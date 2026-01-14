import type { Page } from "playwright";
import prisma from "@/lib/prisma";

export const collectUiInventory = async (
  page: Page,
  runId: string,
  label: string,
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>,
  activeStepId?: string | null
) => {
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
          href: el.href,
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
          action: el.action || null,
          method: el.method || null,
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

    if (log) {
      await log("info", "Captured UI inventory.", {
        label,
        stepId: activeStepId ?? null,
        uiInventory,
      });
    }
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
    if (log) {
      await log("warning", "Failed to capture UI inventory.", {
        label,
        stepId: activeStepId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return null;
};
