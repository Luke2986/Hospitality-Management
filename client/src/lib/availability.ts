import { format } from "date-fns";

export type BookedRange = { roomId: string; checkIn: string; checkOut: string };

// Local calendar date; toISOString() would convert to UTC and shift the day in many time zones.
export const toDateString = (date: Date) => format(date, "yyyy-MM-dd");

export function availableRooms<T extends { id: string }>(rooms: T[], ranges: BookedRange[], from: Date, to: Date) {
  const checkIn = toDateString(from);
  const checkOut = toDateString(to);
  return rooms.filter(
    (room) => !ranges.some((r) => r.roomId === room.id && r.checkIn < checkOut && r.checkOut > checkIn),
  );
}
