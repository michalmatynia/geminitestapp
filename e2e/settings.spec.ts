import { test, expect } from "@playwright/test";

test.describe("Settings pages", () => {
  test("loads settings index with links", async ({ page }) => {
    await page.goto("/admin/settings");

    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Notifications/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /AI Settings/ })).toBeVisible();
  });

  test("loads notifications settings", async ({ page }) => {
    await page.goto("/admin/settings/notifications");

    await expect(
      page.getByRole("heading", { name: "Notifications", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview Success" })).toBeVisible();
  });

  test("loads AI settings and GPT section", async ({ page }) => {
    await page.goto("/admin/settings/ai");

    await expect(page.getByRole("heading", { name: "AI API Settings" })).toBeVisible();
    await expect(page.getByText("OpenAI API Key")).toBeVisible();
  });

  test("saves GPT settings and persists on reload", async ({ page }) => {
    const settingsStore = new Map<string, string>([
      ["openai_api_key", ""],
      ["anthropic_api_key", ""],
      ["gemini_api_key", ""],
    ]);

    await page.route("**/api/settings", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        const payload = Array.from(settingsStore.entries()).map(([key, value]) => ({
          key,
          value,
        }));
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(payload),
        });
      }
      if (request.method() === "POST") {
        const body = JSON.parse(request.postData() || "{}") as {
          key?: string;
          value?: string;
        };
        if (body.key) {
          settingsStore.set(body.key, body.value ?? "");
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      }
      return route.fallback();
    });

    await page.goto("/admin/settings/ai");

    await page.getByPlaceholder("sk-...").fill("sk-test-openai");
    await page.getByPlaceholder("sk-ant-...").fill("sk-test-anthropic");
    await page.getByPlaceholder("AIza...").fill("sk-test-gemini");
    
    await page.getByRole("button", { name: "Save Keys" }).click();

    await expect(page.getByText("API keys saved successfully")).toBeVisible();

    await page.reload();

    await expect(page.getByPlaceholder("sk-...")).toHaveValue("sk-test-openai");
    await expect(page.getByPlaceholder("sk-ant-...")).toHaveValue("sk-test-anthropic");
    await expect(page.getByPlaceholder("AIza...")).toHaveValue("sk-test-gemini");
  });
});
