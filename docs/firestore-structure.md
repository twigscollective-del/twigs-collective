# Firestore Structure

Use these top-level collections:

| Collection | Purpose |
| --- | --- |
| `users` | Auth profile, active flag, role mirror, display name. Privileged roles should come from custom claims. |
| `customers` | Customer profile, contact, ID metadata, balance, deposit held, restriction status. |
| `dressDesigns` | Reusable design-level information such as name, description, material, rules, and included accessories. |
| `inventoryItems` | One document per physical dress, costume, accessory, or prop. This prevents quantity-only stock mistakes. |
| `categories` | Configurable public/admin categories and inventory number codes. |
| `bookings` | Booking header, dates, customer, status, totals, notes, terms, staff owner. |
| `bookingItems` | Optional separate item rows for large bookings or reporting joins. Booking documents may also embed small item summaries. |
| `payments` | Immutable transaction records for cash, UPI, bank, fees, deposits, deductions, and refunds. |
| `refunds` | Refund approvals and payout tracking. |
| `expenses` | Shop expense records with category, supplier/payee, method, receipt image URL, and approval fields. |
| `cleaningRecords` | Cleaning lifecycle by dress ID and responsible booking. |
| `repairRecords` | Repair lifecycle, cost, damage description, and final status. |
| `notifications` | In-app notification queue and external notification metadata. |
| `settings` | Shop identity, UPI, receipt prefixes, fees, buffers, terms, templates, and backup preferences. |
| `auditLogs` | Append-only important actions. Ordinary staff cannot edit these records. |

Images belong in Firebase Storage. Firestore should store only secure download URLs, content type, size, uploaded-by user ID, and timestamps.

## Availability Query Pattern

Before confirming a reservation, query bookings where:

- `bookingStatus` is one of `Approved`, `Advance Pending`, `Confirmed`, `Ready for Pickup`, `Issued`, `Partially Returned`, `Inspection Pending`, `Overdue`
- selected item ID exists in the booking item list or related `bookingItems`
- existing `pickupDateTime < newExpectedReturnDateTime + preparationBuffer`
- existing `expectedReturnDateTime + preparationBuffer > newPickupDateTime`

Run confirmation in a Firestore transaction or callable Cloud Function so overlapping bookings cannot both be confirmed.
