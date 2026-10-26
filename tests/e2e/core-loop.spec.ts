import { expect, test, type Page } from "playwright/test";
import { makeFixtures, type Fixtures } from "./fixtures";

let fixtures: Fixtures;

test.beforeAll(async () => {
  fixtures = await makeFixtures();
});

async function openWorkspace(page: Page): Promise<void> {
  await page.goto("/setup");
  if (new URL(page.url()).pathname === "/setup") {
    await page.getByRole("textbox", { name: "Display name" }).fill("Maya Chen");
    await page.getByRole("radio", { name: /Both/ }).check();
    await page
      .getByRole("checkbox", { name: /I understand this workspace/ })
      .check();
    await page.getByRole("button", { name: "Open the workspace" }).click();
  }
  await expect(page).toHaveURL(/\/cleanups$/);
}

async function createCleanup(page: Page, site: string): Promise<string> {
  await page.goto("/cleanups");
  await page.getByRole("link", { name: "New cleanup", exact: true }).click();
  await page.getByLabel("Site label").fill(site);
  await page
    .getByRole("checkbox", { name: /I took these photos/ })
    .check();
  await page.getByRole("button", { name: "Create cleanup" }).click();
  await expect(page).toHaveURL(/\/cleanups\/[0-9a-f-]{36}$/);

  const id = new URL(page.url()).pathname.split("/").pop();
  if (!id) throw new Error("Cleanup id missing from the URL.");
  return id;
}

async function createPair(page: Page): Promise<void> {
  await page.getByRole("button", { name: "New pair" }).click();
  await expect(page).toHaveURL(/\/pairs\/[0-9a-f-]{36}$/);
}

async function uploadPhoto(
  page: Page,
  side: "Before" | "After",
  file: string,
): Promise<void> {
  const section = page.locator(`section[aria-label="${side} photo"]`);
  await expect(section).toBeVisible();
  await section.locator('input[type="file"]').setInputFiles(file);
  await expect(section.getByText("Stored", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
}

async function addDraftClaim(
  page: Page,
  observation: string,
): Promise<void> {
  await page.getByRole("button", { name: "Mark full photo" }).click();
  await page.getByLabel("Observation", { exact: true }).fill(observation);
  await page
    .getByLabel("ICC category", { exact: true })
    .selectOption("Beverage Cans");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.")).toBeVisible();
}

async function setComparable(page: Page): Promise<void> {
  await page.getByRole("radio", { name: /^Comparable/ }).check();
  await page.getByRole("button", { name: "Save comparability" }).click();
  await expect(page.getByText(/Comparability set to Comparable/)).toBeVisible();
}

async function submitForReview(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText(/Submitted 1 claim for review/)).toBeVisible();
}

async function openReviewFor(
  page: Page,
  observation: string,
): Promise<void> {
  await page.goto("/review");
  const queue = page.getByRole("navigation", { name: "Review queue" });
  await queue.getByRole("link").filter({ hasText: observation }).click();
  await expect(
    page.locator('article[aria-label="Claim review"]').getByRole("heading", {
      name: observation,
    }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("a real capture becomes a confirmed, exported, and published record", async ({
  page,
}) => {
  await openWorkspace(page);

  const site = "North Jetty, Bodega Bay";
  const observation =
    "A cluster of beverage cans was removed from the north jetty rock line.";
  const cleanupId = await createCleanup(page, site);

  await createPair(page);
  await uploadPhoto(page, "Before", fixtures.before);
  await uploadPhoto(page, "After", fixtures.after);
  await addDraftClaim(page, observation);
  await setComparable(page);
  await submitForReview(page);

  await openReviewFor(page, observation);
  const review = page.locator('article[aria-label="Claim review"]');
  await review.locator("#review-note").fill("Checked against the after photo.");
  await review.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(review.getByText(/Checked against the after photo/)).toBeVisible();

  await page.goto(`/cleanups/${cleanupId}/export`);
  await expect(
    page.getByRole("heading", { name: "Export and publish" }),
  ).toBeVisible();
  await expect(page.getByText(/1 confirmed claim/).first()).toBeVisible();

  const download = await page.request.get(
    `/api/cleanups/${cleanupId}/export?format=json`,
  );
  expect(download.status()).toBe(200);
  const payload = await download.json();
  expect(payload.schema).toBe("shoreproof.export.v1");
  expect(payload.claims).toHaveLength(1);
  expect(payload.claims[0].text).toBe(observation);
  expect(payload.excluded).toHaveLength(0);

  await page.getByRole("button", { name: "Publish record" }).click();
  await expect(
    page.getByRole("heading", { name: "This record is public" }),
  ).toBeVisible();

  const publicLink = page.getByRole("link", { name: /^\/p\// });
  const href = await publicLink.getAttribute("href");
  expect(href).toMatch(/^\/p\/[A-Za-z0-9_-]+$/);

  await page.goto(href ?? "/");
  await expect(page.getByRole("heading", { name: site })).toBeVisible();
  await expect(page.getByText(observation)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("insufficient evidence returns the claim and blocks publishing", async ({
  page,
}) => {
  await openWorkspace(page);

  const site = "Driftwood Cove";
  const observation = "A tangle of rope was pulled from the upper beach.";
  const cleanupId = await createCleanup(page, site);

  await createPair(page);
  await uploadPhoto(page, "Before", fixtures.before);
  await uploadPhoto(page, "After", fixtures.after);
  await addDraftClaim(page, observation);
  await setComparable(page);
  await submitForReview(page);

  await openReviewFor(page, observation);
  const review = page.locator('article[aria-label="Claim review"]');

  await review
    .getByRole("button", { name: "Insufficient evidence" })
    .click();
  await expect(page.getByText(/Say what evidence is missing/)).toBeVisible();

  const note =
    "The after photo crops out the marked rope. Retake from the same position.";
  await review.locator("#review-note").fill(note);
  await review
    .getByRole("button", { name: "Insufficient evidence" })
    .click();
  await expect(
    page.getByText(/Claim returned to Maya Chen for more evidence/),
  ).toBeVisible();

  await page.goto("/review");
  await page.getByText("Returned to collectors", { exact: true }).click();
  await expect(page.getByText(note)).toBeVisible();

  const download = await page.request.get(
    `/api/cleanups/${cleanupId}/export?format=json`,
  );
  expect(download.status()).toBe(200);
  const payload = await download.json();
  expect(payload.claims).toHaveLength(0);
  expect(payload.excluded).toHaveLength(1);
  expect(payload.excluded[0].status).toBe("insufficient");

  await page.goto(`/cleanups/${cleanupId}/export`);
  await expect(page.getByText("Before publishing")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish record" }),
  ).toBeDisabled();
});
