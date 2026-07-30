# Staff User Guide

## Booking Flow

1. Search the catalogue or inventory.
2. Create a customer profile if needed.
3. Create a booking request with pickup and expected return date/time.
4. Keep website requests as `Pending Approval`.
5. Confirm only after checking conflicts.
6. Record advance payment as a separate transaction.
7. Verify UPI manually. A screenshot is evidence only, not automatic verification.

## Pickup Flow

1. Search by booking number, customer name, or phone.
2. Verify customer details and required ID information.
3. Confirm payment and security deposit.
4. Scan each dress QR code.
5. Confirm accessories.
6. Record issue condition notes and photos.
7. Generate agreement, issue slip, and receipt.
8. Mark booking as `Issued` and item status as `Rented`.

Manager override is required when payment requirements are incomplete. Record the reason so it appears in audit logs.

## Return Flow

1. Search or scan the booking.
2. Scan each returned item.
3. Support partial returns when not all items are back.
4. Compare issue and return condition.
5. Record stains, tears, damage, missing accessories, or lost items.
6. Add cleaning, repair, replacement, late, or extra-day charges.
7. Calculate deposit deductions and refundable amount.
8. Process refund only after approval rules pass.
9. Send each item to `Available`, `Cleaning`, `Repair`, `Damaged`, `Lost`, or `Retired`.

Do not move a returned item straight to `Available` until inspection is complete.
