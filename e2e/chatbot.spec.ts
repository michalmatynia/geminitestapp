import { test, expect } from "@playwright/test";

test.describe("Chatbot UI", () => {
  test("shows the chatbot page and tool dropdown", async ({ page }) => {
    await page.goto("/admin/chatbot");

    await expect(page.getByRole("heading", { name: "Chatbot" })).toBeVisible();
    await expect(page.getByPlaceholder("Ask the assistant...")).toBeVisible();

    const toolSelect = page.getByRole("button", { name: "Select tool" });
    await toolSelect.click();
    await expect(page.getByRole("option", { name: "Web search" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Global context" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Local context" })).toBeVisible();
  });

  test("toggles tools and reveals local context section", async ({ page }) => {
    await page.goto("/admin/chatbot");

    await expect(page.getByText("Conversation context")).toHaveCount(0);
    await page.getByRole("button", { name: "Select tool" }).click();
    await page.getByRole("option", { name: "Local context" }).click();

    await expect(page.getByText("Local context")).toBeVisible();
    await expect(page.getByText("Conversation context")).toBeVisible();
  });
});
