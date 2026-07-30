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
  updateDoc,
  where
} from "firebase/firestore";
import type { Booking, InventoryItem, PaymentTransaction } from "../types";
import { db } from "./firebase";
import { findAvailabilityConflicts } from "../utils/availability";

type FirestoreEntry = { id: string; data: () => Record<string, unknown> };

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

  const ref = await addDoc(collection(db, "payments"), {
    ...payment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
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
