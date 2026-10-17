import { test, expect, db, PASSWORD } from "./fixtures";

test("signs up, is blocked until the email is verified, then logs in", async ({ page }) => {
  await page.goto("/signup");
  await page.getByTestId("input-fullname").fill("Anna Bianchi");
  await page.getByTestId("input-email").fill("anna@example.test");
  await page.getByTestId("input-password").fill(PASSWORD);
  await page.getByTestId("button-signup").click();
  await expect(page.getByTestId("text-signup-sent")).toBeVisible();

  await page.goto("/login");
  await page.getByTestId("input-email").fill("anna@example.test");
  await page.getByTestId("input-password").fill(PASSWORD);
  await page.getByTestId("button-login").click();
  await expect(page.getByTestId("alert-email-not-verified")).toBeVisible();

  await db.query("UPDATE users SET email_verified_at = now() WHERE email = $1", ["anna@example.test"]);
  await page.getByTestId("button-login").click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("rejects a wrong password", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("input-email").fill("nobody@example.test");
  await page.getByTestId("input-password").fill("wrong-password");
  await page.getByTestId("button-login").click();
  await expect(page.getByText("Errore", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("sends logged-out visitors from the dashboard to the login page", async ({ page }) => {
  await page.goto("/dashboard/bookings");
  await expect(page).toHaveURL(/\/login$/);
});
