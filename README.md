# ابني بيتك (ebny-bitak)

Arabic real-estate search app. Visitors filter houses by region (1–7), sector (أ–ي), and house number. Sellers publish listings, and an admin creates seller accounts. Admin access comes only from the Firestore user document.

## Run locally

```bash
ng serve
```

Open `http://localhost:4200/`.

## Firebase

1. Create a Firebase project and a Web app.
2. Enable **Authentication → Email/Password**, **Cloud Firestore**, and **Storage**.
3. Copy the web config into `src/app/core/firebase-config.ts`.
4. Deploy the rules in `firestore.rules` and `storage.rules` (see `firebase.json`).
5. Create the first admin outside the app:
   - Authentication → Add user.
   - Firestore document `ebny_bitak/root/users/{that-uid}` with `role: "admin"`, plus `email`, `displayName`, `phone`, `sellerType: null`, `rating: 0`, and `createdAt`.
6. Sign in as that admin and add sellers from **البائعون**. Sellers then add houses from **إضافة منزل**.

Replace `https://ebny-bitak.web.app/` in `src/index.html`, `public/robots.txt`, and `public/sitemap.xml` with the real domain before publishing.

Each house stores at most 3 photos. A region + sector + house number can belong to only one listing; the add form shows the current seller if that home already exists. House visits and “show phone” taps are stored per day and can be filtered on the listing and on **الإحصائيات**.

Phone numbers are hidden in the interface until the visitor taps the button. Firestore still returns the field with the house document; hiding it from the network entirely needs a Cloud Function later.

## Scripts

```bash
ng build
ng test
```
