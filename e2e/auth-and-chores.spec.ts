import { expect, test, type Locator, type Page } from "@playwright/test";

const E2E_CHORE_TITLE = "E2E Dishwasher Reset";

async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app(?:\/my-chores)?$/);
}

async function targetChoreCard(page: Page): Promise<{ card: Locator; button: Locator }> {
  const card = page.locator("[data-testid^='chore-card-']").filter({ hasText: E2E_CHORE_TITLE }).first();
  await expect(card).toBeVisible();
  const button = card.locator("[data-testid^='chore-action-']").first();
  await expect(button).toBeVisible();
  return { card, button };
}

test.describe("Kid and parent E2E flows", () => {
  test("kid can clear unread notifications from the bell drawer", async ({ page }) => {
    await loginAs(page, "kid1", "kid1234");
    await expect(page.getByRole("heading", { name: "Today's chores" })).toBeVisible();

    await page.getByLabel("notifications").click();
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    await expect(page.getByText("Tap a message to open it and mark it as read.")).toBeVisible();

    const markAllRead = page.getByRole("button", { name: "Mark all read" });
    if (await markAllRead.isEnabled()) {
      await markAllRead.click();
      await expect(page.getByText("New")).toHaveCount(0);
    }
  });

  test("kid submission appears in parent approvals and can be approved", async ({ browser }) => {
    const kidContext = await browser.newContext();
    const kidPage = await kidContext.newPage();
    await loginAs(kidPage, "kid1", "kid1234");
    await expect(kidPage.getByRole("heading", { name: "Today's chores" })).toBeVisible();

    const kidTask = await targetChoreCard(kidPage);
    const initialLabel = (await kidTask.button.innerText()).trim();
    if (/not finished yet|undo/i.test(initialLabel)) {
      await kidTask.button.click();
      await expect(kidTask.button).toHaveText(/I finished this|Mark done|Try again|Resubmit/);
    }

    await kidTask.button.click();
    await expect(kidTask.button).toHaveText(/Not finished yet|Undo/);

    const parentContext = await browser.newContext();
    const parentPage = await parentContext.newPage();
    await loginAs(parentPage, "parent", "parent1234");
    await parentPage.goto("/app/admin/approvals");
    await expect(parentPage.getByRole("heading", { name: "Approvals" })).toBeVisible();

    const approvalCard = parentPage
      .locator("[data-testid^='approval-card-']")
      .filter({ hasText: E2E_CHORE_TITLE })
      .filter({ hasText: "Kid 1" })
      .first();
    await expect(approvalCard).toBeVisible();
    await approvalCard.locator("[data-testid^='approval-approve-']").first().click();
    await expect(approvalCard).toHaveCount(0);

    await kidPage.reload();
    const refreshedCard = kidPage.locator("[data-testid^='chore-card-']").filter({ hasText: E2E_CHORE_TITLE }).first();
    await expect(refreshedCard.getByText("Approved")).toBeVisible();

    await parentContext.close();
    await kidContext.close();
  });
});
