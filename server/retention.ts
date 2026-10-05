import { storage } from "./storage";
import { log } from "./vite";
import { logError } from "./log-error";

const DAY_MS = 24 * 60 * 60 * 1000;

export function guestDataRetentionMonths() {
  const months = Number(process.env.GUEST_DATA_RETENTION_MONTHS || 24);
  if (!Number.isInteger(months) || months < 1) {
    throw new Error("GUEST_DATA_RETENTION_MONTHS must be a positive whole number of months");
  }
  return months;
}

// Strips guests' personal data from bookings that ended more than the retention period ago (GDPR art. 5(1)(e)).
export function startGuestDataRetention() {
  const months = guestDataRetentionMonths();
  const run = () =>
    storage
      .anonymizeBookingsEndedBefore(months)
      .then((count) => count && log(`Anonymized ${count} bookings older than ${months} months`, "retention"))
      .catch((err) => logError("Guest data retention", err));
  run();
  setInterval(run, DAY_MS).unref();
}
