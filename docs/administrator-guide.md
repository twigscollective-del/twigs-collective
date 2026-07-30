# Administrator Guide

## First Setup

1. Create a Firebase project.
2. Enable Firebase Authentication with Email/Password.
3. Create Firestore and Firebase Storage.
4. Copy `.env.example` to `.env.local` and fill in the Firebase web app values.
5. Deploy `firestore.rules`, `storage.rules`, and `firestore.indexes.json`.
6. Create the first owner account in Firebase Authentication.
7. Assign the first owner role with Firebase custom claims from a trusted server script or the Firebase Admin SDK.

Do not let client code assign elevated roles. The `users` document can mirror a role for display, but security decisions should rely on custom claims.

## Production Checklist

- Remove sample development data from `src/data/sampleData.ts`.
- Configure real shop address, phone, WhatsApp number, UPI ID, UPI QR image, opening hours, receipt prefixes, and terms.
- Store customer identification images only under the protected `customerDocuments` Storage path.
- Verify every privileged account has the right role and active status.
- Test booking confirmation with overlapping dates.
- Test UPI duplicate reference prevention.
- Test large refund and large deposit deduction approval.
- Export the first daily collection report and compare it with cash drawer and UPI app records.

## Backups

Use scheduled Firestore exports to Cloud Storage for production. Keep export permissions restricted to owner/admin service accounts.
