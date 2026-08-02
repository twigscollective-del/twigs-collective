import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import type {
  AuditLog,
  Booking,
  CleaningRecord,
  DepositStatus,
  Expense,
  InventoryItem,
  PaymentStatus,
  PaymentTransaction,
  Refund,
  RepairRecord,
  ShopSettings
} from "../types";
import { db } from "./firebase";
import { findAvailabilityConflicts } from "../utils/availability";

type FirestoreEntry = { id: string; data: () => Record<string, unknown> };

function cleanObject<T extends Record<string, unknown>>(entry: T) {
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined));
}

export async function listCollection<T>(collectionName: string, fallback: T[]) {
  if (!db) return fallback;
  const snap = await getDocs(query(collection(db, collectionName), limit(200)));
  return snap.docs.map((entry: FirestoreEntry) => ({ id: entry.id, ...entry.data() })) as T[];
}

export async function saveBookingRequest(payload: Omit<Booking, "id" | "createdAt" | "updatedAt">) {
  if (!db) throw new Error("Firebase is not configured. Copy .env.example to .env.local and add your project values.");
  const ref = await addDoc(collection(db, "bookings"), {
    ...payload,
    bookingStatus: "Pending Approval",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function confirmBookingTransaction(
  booking: Booking,
  allBookings: Booking[],
  bufferHours: number
) {
  if (!db) throw new Error("Firebase is not configured.");
  const firestore = db;

  await runTransaction(firestore, async (transaction) => {
    for (const item of booking.items) {
      const conflicts = findAvailabilityConflicts(
        item.inventoryItemId,
        booking.pickupDateTime,
        booking.expectedReturnDateTime,
        allBookings,
        bufferHours,
        booking.id
      );
      if (conflicts.length > 0) {
        throw new Error(`${item.dressId} conflicts with ${conflicts[0].bookingNumber}.`);
      }
    }

    transaction.update(doc(firestore, "bookings", booking.id), {
      bookingStatus: "Confirmed",
      updatedAt: serverTimestamp()
    });

    booking.items.forEach((item) => {
      transaction.update(doc(firestore, "inventoryItems", item.inventoryItemId), {
        currentStatus: "Reserved",
        updatedAt: serverTimestamp()
      });
    });
  });
}

export async function addPaymentTransaction(payment: Omit<PaymentTransaction, "id" | "createdAt" | "updatedAt">) {
  if (!db) throw new Error("Firebase is not configured.");
  if (payment.upiReference) {
    const duplicate = await getDocs(
      query(collection(db, "payments"), where("upiReference", "==", payment.upiReference), limit(1))
    );
    if (!duplicate.empty) throw new Error("This UPI reference number has already been recorded.");
  }

  const cleanPayment = cleanObject(payment);
  const ref = await addDoc(collection(db, "payments"), {
    ...cleanPayment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updatePaymentVerificationStatus(
  paymentId: string,
  verificationStatus: PaymentTransaction["verificationStatus"]
) {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, "payments", paymentId), {
    verificationStatus,
    updatedAt: serverTimestamp()
  });
}

export async function updateBookingPaymentSummary(
  bookingId: string,
  totalReceived: number,
  paymentStatus: PaymentStatus
) {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, "bookings", bookingId), {
    totalReceived,
    paymentStatus,
    updatedAt: serverTimestamp()
  });
}

export async function updateBookingDepositSettlement(
  bookingId: string,
  settlement: {
    lateFees: number;
    cleaningCharges: number;
    damageCharges: number;
    missingItemCharges: number;
    refundableAmount: number;
    depositStatus: DepositStatus;
  }
) {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, "bookings", bookingId), {
    ...settlement,
    updatedAt: serverTimestamp()
  });
}

export async function addRefundRecord(refund: Omit<Refund, "id">) {
  if (!db) throw new Error("Firebase is not configured.");
  const cleanRefund = cleanObject(refund);
  const ref = await addDoc(collection(db, "refunds"), {
    ...cleanRefund,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateRefundStatus(refundId: string, status: Refund["status"], approvedBy?: string) {
  if (!db) throw new Error("Firebase is not configured.");
  const payload = Object.fromEntries(
    Object.entries({
      status,
      approvedBy,
      refundDate: status === "Paid" ? new Date().toISOString() : undefined,
      updatedAt: serverTimestamp()
    }).filter(([, value]) => value !== undefined)
  );
  await updateDoc(doc(db, "refunds", refundId), payload);
}

export async function updateBookingReturnInspection(
  bookingId: string,
  payload: Pick<Booking, "bookingStatus" | "actualReturnDateTime" | "lateFees" | "cleaningCharges" | "damageCharges" | "missingItemCharges" | "refundableAmount" | "internalNotes">
) {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, "bookings", bookingId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
}

export async function addCleaningRecord(record: Omit<CleaningRecord, "id">) {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = await addDoc(collection(db, "cleaningRecords"), {
    ...cleanObject(record),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function addRepairRecord(record: Omit<RepairRecord, "id">) {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = await addDoc(collection(db, "repairRecords"), {
    ...cleanObject(record),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateCleaningRecordStatus(recordId: string, status: CleaningRecord["status"]) {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, "cleaningRecords", recordId), {
    status,
    actualCompletionDate: status === "Completed" ? new Date().toISOString().slice(0, 10) : undefined,
    updatedAt: serverTimestamp()
  });
}

export async function updateRepairRecordStatus(recordId: string, status: RepairRecord["status"], actualCost?: number) {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, "repairRecords", recordId), cleanObject({
    status,
    actualCost,
    actualCompletionDate: status === "Completed" ? new Date().toISOString().slice(0, 10) : undefined,
    updatedAt: serverTimestamp()
  }));
}

export async function addExpenseRecord(expense: Omit<Expense, "id">) {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = await addDoc(collection(db, "expenses"), {
    ...cleanObject(expense),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateExpenseApproval(expenseId: string, approvedBy: string) {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, "expenses", expenseId), {
    approvedBy,
    updatedAt: serverTimestamp()
  });
}

export async function saveShopSettings(settings: ShopSettings) {
  if (!db) throw new Error("Firebase is not configured.");
  await setDoc(doc(db, "settings", "shop"), {
    ...settings,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function addAuditLogRecord(log: Omit<AuditLog, "id">) {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = await addDoc(collection(db, "auditLogs"), {
    ...cleanObject(log),
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateInventoryStatus(item: InventoryItem, status: InventoryItem["currentStatus"]) {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, "inventoryItems", item.id), {
    currentStatus: status,
    updatedAt: serverTimestamp()
  });
}

export async function latestAuditLogs() {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(50)));
  return snap.docs.map((entry: FirestoreEntry) => ({ id: entry.id, ...entry.data() }));
}
