import { test, expect } from "@playwright/test";

test.describe("Chatbot UI", () => {
  test("shows the chatbot page and tabs", async ({ page }) => {
    await page.goto("/admin/chatbot");

    await expect(page.getByRole("tab", { name: "Chat" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Settings" })).toBeVisible();
    await expect(page.getByPlaceholder("Type your message...")).toBeVisible();
  });

  test("toggles tools in settings tab", async ({ page }) => {
    await page.goto("/admin/chatbot");

    await page.getByRole("tab", { name: "Settings" }).click();
    
    await expect(page.getByText("General Settings")).toBeVisible();
    
    const localContextCheckbox = page.getByLabel("Use Local Context");
    await expect(localContextCheckbox).toBeVisible();
    
    // Check if it can be toggled
    const isChecked = await localContextCheckbox.isChecked();
    await localContextCheckbox.click();
    expect(await localContextCheckbox.isChecked()).toBe(!isChecked);
  });
});
