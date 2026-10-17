import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test, expect, signUpOwner, createPropertyWithRoom, nextMonthDates, bookFromWidget, db } from "./fixtures";

test("the two-line snippet works on a site with a different domain", async ({ page, browser, baseURL }) => {
  await signUpOwner(page.request);
  const { property, room } = await createPropertyWithRoom(page.request);

  // A stranger's website: another origin (localhost, not 127.0.0.1) that only pastes the snippet.
  const site = createServer((_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!doctype html><html><body>
      <h1>Agriturismo Esterno</h1>
      <div data-booking-widget data-property-id="${property.id}"></div>
      <script src="${baseURL}/widget.js" async></script>
    </body></html>`);
  });
  await new Promise<void>((resolve) => site.listen(0, "localhost", resolve));
  const siteUrl = `http://localhost:${(site.address() as AddressInfo).port}/`;

  try {
    const guest = await (await browser.newContext()).newPage();
    await guest.goto(siteUrl);
    const iframe = guest.locator("iframe[data-booking-widget-iframe]");
    await expect(iframe).toHaveAttribute("src", `${baseURL}/widget/${property.id}`);

    const widget = guest.frameLocator("iframe[data-booking-widget-iframe]");
    await expect(widget.getByRole("heading", { name: "Casa Test" })).toBeVisible();
    await expect.poll(() => iframe.evaluate((el) => (el as HTMLIFrameElement).style.height)).not.toBe("600px");

    await bookFromWidget(widget, room.id, nextMonthDates(10, 13), property.id);
    const { rows } = await db.query("SELECT status FROM bookings");
    expect(rows).toEqual([{ status: "pending" }]);
  } finally {
    site.close();
  }
});
