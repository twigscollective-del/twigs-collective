# Twigs Collective

Complete React/Vite/TypeScript/Firebase starter for a clothing rental catalogue and management Progressive Web App.

## Included

- Public catalogue: home, browse, categories, dress details, availability check, booking request, rules, about, contact, login, and customer bookings.
- Staff dashboard: inventory, customers, bookings, pickup, returns, payments, deposits/refunds, cleaning/repair, expenses, reports, staff roles, settings, and audit logs.
- Business logic: rental totals, deposit settlement, date overlap checks, public availability labels, role permissions, duplicate UPI reference guard.
- Firebase: Auth-ready app config, Firestore repository layer, security rules, Storage rules, indexes, and hosting config.
- PWA: manifest, app icon, service worker, offline fallback, network indicator, responsive staff bottom navigation.
- Documentation: Firestore structure, administrator guide, and staff workflow guide.
- Sample development data for cultural attire, Mizo traditional dresses, superhero, princess, professional, dance, accessories, customers, bookings, payments, active/overdue-like rentals, cleaning, repairs, expenses, refunds, and audit logs.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with your Firebase web app values:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SHOP_WHATSAPP_NUMBER=
VITE_SHOP_UPI_ID=
```

## Firebase Deployment

```bash
npm run build
firebase deploy --only firestore:rules,firestore:indexes,storage,hosting
```

Before production, remove or replace the development sample data in `src/data/sampleData.ts`.

## Staff Login Setup

1. In Firebase Console, open Authentication.
2. Enable the Email/Password sign-in provider.
3. Create a staff user under Authentication > Users.
4. Add the Firebase web app values to `.env.local`.
5. Restart Vite with `npm.cmd run dev`.

The login screen now uses Firebase Authentication. Staff dashboard routes redirect to `/login` until a Firebase user signs in. Role-based security for database access should still be enforced with custom claims before production.

## Core Workflow

Customer enquiry -> Dress selection -> Availability check -> Reservation request -> Approval -> Advance payment -> Pickup -> Active rental -> Return inspection -> Additional charge adjustment -> Deposit refund -> Cleaning or repair -> Available again.

## Security Notes

- Do not store plain-text passwords in Firestore. Use Firebase Authentication.
- Use custom claims for `owner`, `manager`, `counter`, `inventory`, `accountant`, and `customer`.
- Keep customer identification images in restricted Firebase Storage paths.
- Store payments as separate transactions rather than one editable paid amount.
- Treat UPI screenshots as evidence only; staff must verify payment references.
- Never delete inventory with rental history. Archive or retire it.

## Useful Files

- `src/types.ts` - domain model.
- `src/utils/availability.ts` - overlap and public availability logic.
- `src/utils/calculations.ts` - totals, balances, deposits, and collections.
- `src/utils/permissions.ts` - role permission matrix.
- `src/services/repositories.ts` - Firebase operations and transaction examples.
- `firestore.rules` - Firestore security rules.
- `storage.rules` - Storage upload and read protection.
- `docs/firestore-structure.md` - scalable data model.
- `docs/administrator-guide.md` - owner/admin setup.
- `docs/staff-user-guide.md` - staff workflow guide.
