import { test, expect, signUpOwner, createPropertyWithRoom, createBooking } from "./fixtures";

test("the owner's privacy settings appear in the guest privacy notice", async ({ page }) => {
  await signUpOwner(page.request);
  const { property } = await createPropertyWithRoom(page.request);

  await page.goto("/dashboard/settings");
  await page.getByTestId("tab-privacy").click();
  await expect(page.getByTestId("text-privacy-incomplete")).toBeVisible();
  await page.getByTestId("input-privacy-controller").fill("Anna Bianchi");
  await page.getByTestId("input-privacy-address").fill("Via Roma 1, Siena");
  await page.getByTestId("input-privacy-email").fill("privacy@example.test");
  await page.getByTestId("button-save-privacy").click();
  await expect(page.getByText("Dati privacy salvati")).toBeVisible();
  await expect(page.getByTestId("text-privacy-incomplete")).toBeHidden();

  await page.goto(`/widget/${property.id}/privacy`);
  const notice = page.getByTestId("privacy-notice");
  await expect(notice).toContainText("Anna Bianchi, Via Roma 1, Siena");
  await expect(notice.getByRole("link", { name: "privacy@example.test" }).first()).toBeVisible();
  await expect(notice).toContainText("24 mesi");
});

test("the owner erases a guest's personal data", async ({ page }) => {
  await signUpOwner(page.request);
  const { room } = await createPropertyWithRoom(page.request);
  const booking = await createBooking(page.request, room.id);

  await page.goto("/dashboard/bookings");
  await page.getByTestId(`button-anonymize-${booking.id}`).click();
  await page.getByTestId("button-confirm-anonymize").click();

  const row = page.getByTestId(`row-booking-${booking.id}`);
  await expect(row).toContainText("Ospite anonimizzato");
  await expect(row).not.toContainText("Mario Rossi");
  await expect(row).not.toContainText("mario@example.test");
});
