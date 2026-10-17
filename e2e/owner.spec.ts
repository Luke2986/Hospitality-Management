import { test, expect, signUpOwner, createPropertyWithRoom } from "./fixtures";

test("creates a property and a room from the dashboard", async ({ page }) => {
  await signUpOwner(page.request);

  await page.goto("/dashboard/properties");
  await page.getByTestId("button-add-property").click();
  await page.getByTestId("input-property-name").fill("Villa Ulivi");
  await page.getByTestId("input-property-city").fill("Lucca");
  await page.getByTestId("button-save-property").click();
  await expect(page.locator('[data-testid^="card-property-"]').filter({ hasText: "Villa Ulivi" })).toBeVisible();

  await page.goto("/dashboard/rooms");
  await page.getByTestId("button-add-room").click();
  await page.getByTestId("select-property").click();
  await page.getByRole("option", { name: "Villa Ulivi" }).click();
  await page.getByTestId("input-room-name").fill("Suite Verde");
  await page.getByTestId("input-room-guests").fill("3");
  await page.getByTestId("input-room-price").fill("120");
  await page.getByTestId("button-save-room").click();

  const card = page.locator('[data-testid^="card-room-"]').filter({ hasText: "Suite Verde" });
  await expect(card).toContainText("3 ospiti");
  await expect(card).toContainText("120.00/notte");
});

test("archives a room and restores it", async ({ page }) => {
  await signUpOwner(page.request);
  const { room } = await createPropertyWithRoom(page.request);

  await page.goto("/dashboard/rooms");
  await page.getByTestId(`button-archive-room-${room.id}`).click();
  await expect(page.getByTestId(`card-room-${room.id}`)).toBeHidden();

  const archive = page.getByTestId("archive-rooms");
  await expect(archive).toContainText("Camera Rossa");
  await page.getByTestId(`button-restore-${room.id}`).click();
  await expect(page.getByTestId(`card-room-${room.id}`)).toBeVisible();
});
