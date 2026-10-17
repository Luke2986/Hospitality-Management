import { test, expect, signUpOwner, createPropertyWithRoom, createBooking, nextMonthDates } from "./fixtures";

test("a guest books from the widget and the owner confirms the request", async ({ page, browser }) => {
  await signUpOwner(page.request);
  const { property, room } = await createPropertyWithRoom(page.request);
  const { checkIn, checkOut } = nextMonthDates(10, 13);

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`/widget/${property.id}`);
  await guest.getByTestId(`calendar-day-${checkIn}`).click();
  await guest.getByTestId(`calendar-day-${checkOut}`).click();
  await expect(guest.getByTestId(`room-card-${room.id}`)).toContainText("240");
  await guest.getByTestId(`button-select-room-${room.id}`).click();

  await guest.getByTestId("input-guest-name").fill("Mario Rossi");
  await guest.getByTestId("input-guest-email").fill("mario@example.test");
  await guest.getByTestId("button-continue").click();
  await expect(guest.getByTestId("text-privacy-notice").getByRole("link")).toHaveAttribute(
    "href",
    `/widget/${property.id}/privacy`,
  );
  await guest.getByTestId("button-confirm").click();
  await expect(guest.getByText("Richiesta Inviata!")).toBeVisible();
  await guestContext.close();

  await page.goto("/dashboard/bookings");
  const row = page.locator('[data-testid^="row-booking-"]').filter({ hasText: "Mario Rossi" });
  await expect(row.getByTestId("badge-pending")).toBeVisible();
  await row.locator('[data-testid^="button-confirm-"]').click();
  await expect(row.getByTestId("badge-confirmed")).toBeVisible();
});

test("a room already booked for the chosen dates is not offered", async ({ page }) => {
  await signUpOwner(page.request);
  const { property, room } = await createPropertyWithRoom(page.request);
  const { checkIn, checkOut } = nextMonthDates(10, 13);
  await createBooking(page.request, room.id, { checkIn, checkOut });

  await page.goto(`/widget/${property.id}`);
  const overlapping = nextMonthDates(12, 15);
  await page.getByTestId(`calendar-day-${overlapping.checkIn}`).click();
  await page.getByTestId(`calendar-day-${overlapping.checkOut}`).click();
  await expect(page.getByText("Nessuna camera disponibile per le date selezionate")).toBeVisible();

  const free = nextMonthDates(13, 15);
  await page.getByTestId(`calendar-day-${free.checkIn}`).click();
  await page.getByTestId(`calendar-day-${free.checkOut}`).click();
  await expect(page.getByTestId(`room-card-${room.id}`)).toBeVisible();
});
