import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import {
  E2E_CHORE_TITLE,
  E2E_KID_NAME,
  E2E_KID_PASSWORD,
  E2E_KID_USERNAME,
  E2E_PARENT_PASSWORD,
  E2E_PARENT_USERNAME,
  resetE2ETestState,
} from "./test-data";

async function loginAs(
  page: Page,
  username: string,
  password: string,
  role: "KID" | "ADULT" = "KID",
) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const expectedLanding = role === "ADULT" ? /\/app\/admin\/stats$/ : /\/app\/my-chores$/;
  await expect(page).toHaveURL(expectedLanding);
}

async function targetChoreCard(page: Page): Promise<{ card: Locator; button: Locator }> {
  const card = page.locator("[data-testid^='chore-card-']").filter({ hasText: E2E_CHORE_TITLE }).first();
  await expect(card).toBeVisible();
  const button = card.locator("[data-testid^='chore-action-']").first();
  await expect(button).toBeVisible();
  return { card, button };
}

test.describe("Kid and parent E2E flows", () => {
  test.beforeEach(async () => {
    await resetE2ETestState();
  });

  test.afterEach(async () => {
    await resetE2ETestState();
  });

  test("kid can clear unread notifications from the bell drawer", async ({ page }) => {
    await loginAs(page, E2E_KID_USERNAME, E2E_KID_PASSWORD, "KID");
    await expect(page.getByRole("heading", { name: "Chores" })).toBeVisible();

    await page.getByLabel("notifications").click();
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    await expect(page.getByText("Tap a message to open it and mark it as read.")).toBeVisible();

    const markAllRead = page.getByRole("button", { name: "Mark all read" });
    if (await markAllRead.isEnabled()) {
      await markAllRead.click();
      await expect(page.getByText("New")).toHaveCount(0);
    }
  });

  test("kid sees weekly day strip behavior and can open leaderboard modal", async ({ page }) => {
    await loginAs(page, E2E_KID_USERNAME, E2E_KID_PASSWORD, "KID");
    await expect(page.getByRole("heading", { name: "Chores" })).toBeVisible();

    const dayStripCard = page.locator(".MuiCard-root").first();
    const dayButtons = dayStripCard.getByRole("button");
    await expect(dayButtons).toHaveCount(7);

    const disabledCount = await dayButtons.evaluateAll((nodes) =>
      nodes.filter((node) => (node as HTMLButtonElement).disabled).length
    );
    const todayDayOfWeek = new Date().getDay(); // 0 = Sunday
    if (todayDayOfWeek === 0) {
      expect(disabledCount).toBe(0);
    } else {
      expect(disabledCount).toBeGreaterThan(0);
    }

    await page.getByRole("button", { name: "Leaderboard" }).click();
    await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("heading", { name: "Leaderboard" })).toHaveCount(0);
  });

  test("kid header icons use new labels and timeOfDay query updates subheading", async ({ page }) => {
    await loginAs(page, E2E_KID_USERNAME, E2E_KID_PASSWORD, "KID");

    await page.goto("/app/my-chores?timeOfDay=evening");
    await expect(page.getByRole("heading", { name: "Chores" })).toBeVisible();
    await expect(page.getByText("Evening hero mode: wrap up chores and earn your rewards!")).toBeVisible();

    await page.getByRole("button", { name: "Rewards" }).click();
    await expect(page.getByRole("heading", { name: "Rewards" })).toBeVisible();
    await page.getByRole("button", { name: "Chores" }).click();
    await expect(page.getByRole("heading", { name: "Chores" })).toBeVisible();
  });

  test("parent lands on family stats and uses header icons plus avatar menu", async ({ page }) => {
    await loginAs(page, E2E_PARENT_USERNAME, E2E_PARENT_PASSWORD, "ADULT");
    await expect(page.getByRole("heading", { name: "Family stats" })).toBeVisible();

    await page.getByRole("button", { name: "Approvals" }).click();
    await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();

    await page.getByRole("button", { name: "Star exchanges" }).click();
    await expect(page.getByRole("heading", { name: "Star exchanges" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0);

    await page.getByRole("button", { name: "Open profile menu" }).click();
    await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Log out" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("kid submission appears in parent approvals and can be approved", async ({ browser }) => {
    const kidContext = await browser.newContext();
    const kidPage = await kidContext.newPage();
    await loginAs(kidPage, E2E_KID_USERNAME, E2E_KID_PASSWORD, "KID");
    await expect(kidPage.getByRole("heading", { name: "Chores" })).toBeVisible();

    const kidTask = await targetChoreCard(kidPage);
    const initialLabel = (await kidTask.button.getAttribute("aria-label")) ?? "";
    if (/not finished yet|undo/i.test(initialLabel)) {
      await kidTask.button.click();
      await expect(kidTask.button).toHaveAttribute("aria-label", /I finished this|Mark done|Try again|Resubmit/i);
    }

    await kidTask.button.click();
    await expect(kidPage.getByRole("heading", { name: "All chores finished for today!" })).toBeVisible();
    await expect(kidPage.getByText(new RegExp(`You finished ${E2E_CHORE_TITLE}`))).toBeVisible();
    await expect(kidPage.getByText(/\+1 coins \(after parent approval\)/i)).toBeVisible();
    await kidPage.getByRole("button", { name: /Done for today|Keep going/i }).click();
    await expect(kidPage.getByRole("heading", { name: "All chores finished for today!" })).toHaveCount(0);
    await expect(kidTask.button).toHaveAttribute("aria-label", /Not finished yet|Undo/i);

    const parentContext = await browser.newContext();
    const parentPage = await parentContext.newPage();
    await loginAs(parentPage, E2E_PARENT_USERNAME, E2E_PARENT_PASSWORD, "ADULT");
    await parentPage.goto("/app/admin/approvals");
    await expect(parentPage.getByRole("heading", { name: "Approvals" })).toBeVisible();

    const approvalCard = parentPage
      .locator("[data-testid^='approval-card-']")
      .filter({ hasText: E2E_CHORE_TITLE })
      .filter({ hasText: E2E_KID_NAME })
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

  test("parent can upload kid avatar, see it in chores assignees, and open family stats", async ({ page }) => {
    await loginAs(page, E2E_PARENT_USERNAME, E2E_PARENT_PASSWORD, "ADULT");

    await page.goto("/app/admin/family");
    await expect(page.getByRole("heading", { name: "Family" })).toBeVisible();

    const kidRow = page.locator("[data-testid^='family-member-']").filter({ hasText: E2E_KID_NAME }).first();
    await expect(kidRow).toBeVisible();
    await expect(kidRow.getByText(/Last login:/i)).toBeVisible();
    await kidRow.click();

    await expect(page.getByRole("dialog", { name: "Manage member" })).toBeVisible();
    const avatarFile = path.resolve(process.cwd(), "e2e/fixtures/member-avatar.svg");
    await page.locator("input[type='file']").setInputFiles(avatarFile);
    await expect(page.getByRole("dialog", { name: "Manage member" }).locator("img")).toHaveCount(1);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog", { name: "Manage member" })).toHaveCount(0);

    const refreshedKidRow = page.locator("[data-testid^='family-member-']").filter({ hasText: E2E_KID_NAME }).first();
    await expect(refreshedKidRow.locator("img")).toHaveCount(1);

    await page.goto("/app/admin/chores");
    await expect(page.getByRole("heading", { name: "Chores" })).toBeVisible();
    const choreTitle = page.getByText(E2E_CHORE_TITLE, { exact: true }).first();
    await expect(choreTitle).toBeVisible();
    const assigneeAvatar = choreTitle.locator("xpath=ancestor::div[contains(@class,'MuiBox-root')][1]").locator(".MuiAvatar-root").last();
    await expect(assigneeAvatar).toBeVisible();
    await assigneeAvatar.hover();
    await expect(page.getByRole("tooltip", { name: E2E_KID_NAME })).toBeVisible();

    await page.goto("/app/admin/stats");
    await expect(page.getByRole("heading", { name: "Family stats" })).toBeVisible();
    await expect(page.getByText(/Score formula:/)).toBeVisible();
  });
});
