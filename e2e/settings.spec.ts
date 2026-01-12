import { test, expect } from "@playwright/test";

test.describe("Settings pages", () => {
  test("loads settings index with links", async ({ page }) => {
    await page.goto("/admin/settings");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Notifications" })).toBeVisible();
    await expect(page.getByRole("link", { name: "AI" })).toBeVisible();
  });

  test("loads notifications settings", async ({ page }) => {
    await page.goto("/admin/settings/notifications");

    await expect(
      page.getByRole("heading", { name: "Notification Settings" })
    ).toBeVisible();
    await expect(page.getByText("Preview notifications")).toBeVisible();
  });

  test("loads AI settings and GPT section", async ({ page }) => {
    await page.goto("/admin/settings/ai");

    await expect(page.getByRole("heading", { name: "AI Settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "GPT" })).toBeVisible();
  });

  test("saves GPT settings and persists on reload", async ({ page }) => {
    const settingsStore = new Map<string, string>([
      ["openai_api_key", ""],
      ["openai_model", "gpt-3.5-turbo"],
      [
        "description_generation_prompt",
        "You are a helpful assistant that generates compelling product descriptions.",
      ],
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

    await page.getByPlaceholder("sk-...").fill("sk-test-123");
    await page.getByRole("button", { name: "gpt-3.5-turbo" }).click();
    await page.getByRole("option", { name: "gpt-4o" }).click();
    await page.locator("textarea").fill("New prompt for descriptions.");
    await page.getByRole("button", { name: "Save GPT settings" }).click();

    await expect(page.getByText("AI settings saved")).toBeVisible();

    await page.reload();

    await expect(page.getByPlaceholder("sk-...")).toHaveValue("sk-test-123");
    await expect(page.getByRole("button", { name: "gpt-4o" })).toBeVisible();
    await expect(page.locator("textarea")).toHaveValue("New prompt for descriptions.");
  });
});
