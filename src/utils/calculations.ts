import type { Booking, BookingItem, PaymentTransaction } from "../types";

export function formatCurrency(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function rentalSubtotal(items: BookingItem[]) {
  return items.reduce((sum, item) => sum + item.rentalCharge * item.quantity, 0);
}

export function securityDepositTotal(items: BookingItem[]) {
  return items.reduce((sum, item) => sum + item.securityDeposit * item.quantity, 0);
}

export function bookingTotals(booking: Booking) {
  const rental = rentalSubtotal(booking.items);
  const deposit = securityDepositTotal(booking.items);
  const grossPayable =
    rental +
    deposit +
    booking.additionalCharges +
    booking.lateFees +
    booking.cleaningCharges +
    booking.damageCharges +
    booking.missingItemCharges;
  const netPayable = Math.max(grossPayable - booking.discount, 0);
  const balanceDue = Math.max(netPayable - booking.totalReceived, 0);
  const deductions = booking.cleaningCharges + booking.damageCharges + booking.missingItemCharges + booking.lateFees;
  const refundableDeposit = Math.max(deposit - deductions, 0);
  const finalSettlement = refundableDeposit - balanceDue;

  return {
    rental,
    deposit,
    grossPayable,
    netPayable,
    balanceDue,
    refundableDeposit,
    finalSettlement
  };
}

export function collectionSummary(payments: PaymentTransaction[]) {
  return payments.reduce(
    (summary, payment) => {
      if (payment.verificationStatus !== "Verified") return summary;
      if (payment.transactionType === "Refund") summary.refunds += payment.amount;
      else if (payment.paymentMethod === "Cash") summary.cash += payment.amount;
      else if (payment.paymentMethod === "UPI") summary.upi += payment.amount;
      else summary.other += payment.amount;
      summary.total = summary.cash + summary.upi + summary.other - summary.refunds;
      return summary;
    },
    { cash: 0, upi: 0, other: 0, refunds: 0, total: 0 }
  );
}
