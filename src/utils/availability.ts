import type { Booking, InventoryItem } from "../types";

const blockingStatuses = new Set([
  "Approved",
  "Advance Pending",
  "Confirmed",
  "Ready for Pickup",
  "Issued",
  "Partially Returned",
  "Inspection Pending",
  "Overdue"
]);

export function periodsOverlap(startA: string, endA: string, startB: string, endB: string, bufferHours = 0) {
  const bufferMs = bufferHours * 60 * 60 * 1000;
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime() + bufferMs;
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime() + bufferMs;
  return aStart < bEnd && bStart < aEnd;
}

export function findAvailabilityConflicts(
  itemId: string,
  pickupDateTime: string,
  returnDateTime: string,
  bookings: Booking[],
  bufferHours = 0,
  ignoreBookingId?: string
) {
  return bookings.filter((booking) => {
    if (booking.id === ignoreBookingId) return false;
    if (!blockingStatuses.has(booking.bookingStatus)) return false;
    if (!booking.items.some((item) => item.inventoryItemId === itemId)) return false;
    return periodsOverlap(pickupDateTime, returnDateTime, booking.pickupDateTime, booking.expectedReturnDateTime, bufferHours);
  });
}

export function publicAvailability(item: InventoryItem, bookings: Booking[], from?: string, to?: string, bufferHours = 0) {
  if (!item.publicVisible || item.archived) return "Contact Shop";
  if (["Lost", "Retired", "Damaged", "Repair", "Cleaning"].includes(item.currentStatus)) return "Currently Unavailable";
  if (item.currentStatus === "Rented" || item.currentStatus === "Overdue") return "Reserved";
  if (from && to && findAvailabilityConflicts(item.id, from, to, bookings, bufferHours).length > 0) return "Reserved";
  if (item.currentStatus === "Pending Reservation" || item.currentStatus === "Ready for Pickup") return "Limited Availability";
  return "Available";
}

export function similarAvailableItems(target: InventoryItem, items: InventoryItem[], bookings: Booking[], from: string, to: string) {
  return items
    .filter((item) => item.id !== target.id)
    .filter((item) => item.category === target.category || item.ageGroup === target.ageGroup || item.size === target.size)
    .filter((item) => publicAvailability(item, bookings, from, to) === "Available")
    .slice(0, 4);
}
