import type { Page } from "playwright";

export const extractProductNames = async (page: Page) => {
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

    const parseJson = (value: string | null) => {
      if (!value) return null;
      try {
        const parsed: unknown = JSON.parse(value);
        return parsed;
      } catch {
        return null;
      }
    };

    const collectFromSchema = (node: unknown) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(collectFromSchema);
        return;
      }
      if (typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      const typeValue = record["@type"];
      const typeList = Array.isArray(typeValue)
        ? typeValue.filter((value): value is string => typeof value === "string")
        : typeof typeValue === "string"
          ? [typeValue]
          : [];
      const typeNames = typeList.map((value) => value.toLowerCase());
      if (
        typeNames.includes("product") ||
        typeNames.includes("productgroup") ||
        typeNames.includes("productmodel")
      ) {
        if (typeof record.name === "string") {
          pushName(record.name);
        }
      }
      if (typeNames.includes("itemlist") && Array.isArray(record.itemListElement)) {
        record.itemListElement.forEach((entry) => {
          if (!entry || typeof entry !== "object") return;
          const itemRecord = entry as Record<string, unknown>;
          const item = itemRecord.item;
          if (typeof itemRecord.name === "string") {
            pushName(itemRecord.name);
          }
          if (item && typeof item === "object") {
            const itemObj = item as Record<string, unknown>;
            if (typeof itemObj.name === "string") {
              pushName(itemObj.name);
            }
          }
        });
      }
      if (record["@graph"]) {
        collectFromSchema(record["@graph"]);
      }
    };

    for (const selector of productSelectors) {
      document.querySelectorAll(selector).forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const element = node;
        for (const nameSelector of nameSelectors) {
          const nameNode = element.querySelector<HTMLElement>(nameSelector);
          if (nameNode?.innerText) {
            pushName(nameNode.innerText);
            break;
          }
        }
        if (element.getAttribute("data-product-name")) {
          pushName(element.getAttribute("data-product-name"));
        }
        const img = element.querySelector<HTMLImageElement>("img[alt]");
        if (img?.alt) {
          pushName(img.alt);
        }
      });
    }

    document
      .querySelectorAll("a[href*='/product' i], a[href*='product' i]")
      .forEach((link) => {
        if (!(link instanceof HTMLElement)) return;
        const text = link.innerText;
        if (text) pushName(text);
      });

    document.querySelectorAll("h2, h3, h4").forEach((heading) => {
      if (!(heading instanceof HTMLElement)) return;
      pushName(heading.innerText);
    });

    document
      .querySelectorAll("script[type='application/ld+json']")
      .forEach((script) => {
        const parsed = parseJson(script.textContent);
        if (parsed) {
          collectFromSchema(parsed);
        }
      });

    return candidates;
  });
};

export const extractProductNamesFromSelectors = async (
  page: Page,
  selectors: string[]
) => {
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
        if (!(node instanceof HTMLElement)) return;
        const element = node;
        const text = element.innerText || element.textContent;
        if (text) pushName(text);
        if (element.getAttribute("data-product-name")) {
          pushName(element.getAttribute("data-product-name"));
        }
        const img = element.querySelector<HTMLImageElement>("img[alt]");
        if (img?.alt) {
          pushName(img.alt);
        }
      });
    });

    return candidates;
  }, selectors);
};

export const extractEmailsFromDom = async (page: Page) => {
  if (!page) return [];
  return page.evaluate(() => {
    const emails = new Set<string>();
    document.querySelectorAll("a[href^='mailto:']").forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.getAttribute("href") || "";
      const email = href.replace(/^mailto:/i, "").split("?")[0]?.trim();
      if (email) emails.add(email);
    });
    document
      .querySelectorAll("[data-email], [data-mail], [data-contact]")
      .forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const element = node;
        const value =
          element.getAttribute("data-email") ||
          element.getAttribute("data-mail") ||
          element.getAttribute("data-contact") ||
          "";
        if (value.includes("@")) {
          value
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean)
            .forEach((item) => emails.add(item));
        }
      });
    return Array.from(emails);
  });
};

export const waitForProductContent = async (page: Page) => {
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

export const autoScroll = async (page: Page) => {
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

export const findProductListingUrls = async (page: Page) => {
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
