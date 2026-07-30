import type { BookingStatus, CustomerStatus, DepositStatus, DressStatus, PaymentStatus } from "../types";

const dressColors: Record<DressStatus, string> = {
  Available: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Pending Reservation": "bg-sky-100 text-sky-800 border-sky-200",
  Reserved: "bg-blue-100 text-blue-800 border-blue-200",
  "Ready for Pickup": "bg-indigo-100 text-indigo-800 border-indigo-200",
  Rented: "bg-purple-100 text-purple-800 border-purple-200",
  Overdue: "bg-red-100 text-red-800 border-red-200",
  "Returned - Inspection Pending": "bg-amber-100 text-amber-800 border-amber-200",
  Cleaning: "bg-orange-100 text-orange-800 border-orange-200",
  Repair: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Damaged: "bg-red-200 text-red-950 border-red-300",
  Lost: "bg-red-950 text-white border-red-950",
  Retired: "bg-stone-200 text-stone-700 border-stone-300"
};

const genericColors: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Restricted: "bg-amber-100 text-amber-800 border-amber-200",
  Blacklisted: "bg-red-950 text-white border-red-950",
  Inactive: "bg-stone-200 text-stone-700 border-stone-300",
  Paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Partially Paid": "bg-blue-100 text-blue-800 border-blue-200",
  Unpaid: "bg-red-100 text-red-800 border-red-200",
  Outstanding: "bg-red-100 text-red-800 border-red-200",
  "Refund Pending": "bg-amber-100 text-amber-800 border-amber-200",
  Refunded: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Held: "bg-blue-100 text-blue-800 border-blue-200",
  "Partially Deducted": "bg-amber-100 text-amber-800 border-amber-200",
  Completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  Issued: "bg-purple-100 text-purple-800 border-purple-200",
  "Pending Approval": "bg-amber-100 text-amber-800 border-amber-200",
  Cancelled: "bg-stone-200 text-stone-700 border-stone-300"
};

export function StatusBadge({
  status
}: {
  status: DressStatus | BookingStatus | PaymentStatus | DepositStatus | CustomerStatus | string;
}) {
  const color = dressColors[status as DressStatus] || genericColors[status] || "bg-stone-100 text-stone-700 border-stone-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>
      {status}
    </span>
  );
}
