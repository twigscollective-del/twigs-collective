declare module "firebase/app" {
  export interface FirebaseApp {}
  export function initializeApp(config: Record<string, string | undefined>): FirebaseApp;
}

declare module "firebase/auth" {
  import type { FirebaseApp } from "firebase/app";

  export interface Auth {}
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
  }
  export const browserLocalPersistence: unknown;
  export function getAuth(app: FirebaseApp): Auth;
  export function setPersistence(auth: Auth, persistence: unknown): Promise<void>;
  export function onAuthStateChanged(auth: Auth, callback: (user: User | null) => void): () => void;
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<{ user: User }>;
  export function sendPasswordResetEmail(auth: Auth, email: string): Promise<void>;
  export function signOut(auth: Auth): Promise<void>;
}

declare module "firebase/firestore" {
  import type { FirebaseApp } from "firebase/app";

  export interface Firestore {}
  export interface DocumentReference {}
  export interface CollectionReference {}
  export interface QueryReference {}
  export interface QuerySnapshot {
    empty: boolean;
    docs: Array<{ id: string; data: () => Record<string, unknown> }>;
  }
  export interface Transaction {
    update(ref: DocumentReference, data: Record<string, unknown>): void;
  }

  export function getFirestore(app: FirebaseApp): Firestore;
  export function collection(db: Firestore, collectionName: string): CollectionReference;
  export function doc(db: Firestore, collectionName: string, id: string): DocumentReference;
  export function addDoc(ref: CollectionReference, data: Record<string, unknown>): Promise<{ id: string }>;
  export function setDoc(ref: DocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
  export function updateDoc(ref: DocumentReference, data: Record<string, unknown>): Promise<void>;
  export function getDocs(ref: QueryReference | CollectionReference): Promise<QuerySnapshot>;
  export function query(ref: CollectionReference, ...constraints: unknown[]): QueryReference;
  export function where(field: string, operator: string, value: unknown): unknown;
  export function orderBy(field: string, direction?: "asc" | "desc"): unknown;
  export function limit(count: number): unknown;
  export function serverTimestamp(): unknown;
  export function runTransaction(db: Firestore, updateFunction: (transaction: Transaction) => Promise<void> | void): Promise<void>;
}

declare module "firebase/storage" {
  import type { FirebaseApp } from "firebase/app";

  export interface FirebaseStorage {}
  export function getStorage(app: FirebaseApp): FirebaseStorage;
}
