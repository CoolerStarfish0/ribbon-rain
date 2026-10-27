# Ribbon Rain

**Made with love, wrapped in ribbons.**

A premium, playful storefront starter for stickers and school labels, built with plain HTML, CSS and JavaScript, with Firebase and Razorpay integration scaffolding.

## Current status
- Responsive storefront UI with search, category filters, product details, colour options, cart and address form.
- Firebase product loading is enabled after `firebase-config.js` is configured.
- Admin dashboard scaffold supports Google sign-in, product editing and photo uploads to Firebase Storage.
- Vercel API scaffolding for Razorpay order creation and payment verification.
- Security rules require an administrator custom claim (`admin: true`) for product writes and image uploads.

**This is not production-ready until Firebase, Vercel environment variables, Razorpay, shipping calculation, and admin claims are configured and tested.** Do not accept real orders before completing setup and testing.

## Local preview
Open `index.html` directly for the visual demo. Without Firebase configuration, the storefront uses clearly labelled sample products and checkout remains in demo mode.

## Firebase setup
1. Create a Firebase project and register a Web app.
2. Copy `firebase-config.example.js` to `firebase-config.js` and fill in the Firebase web app config. Do not put server secrets in this file.
3. Enable Google sign-in in Firebase Authentication.
4. Create Firestore and Firebase Storage.
5. Deploy `firestore.rules` and `storage.rules`.
6. Grant the shop owner the Firebase Auth custom claim `admin: true` using a trusted Admin SDK environment. Never let a client grant itself admin access.
7. Add the Firebase project’s authorized domains.

## Vercel + Razorpay setup
Deploy this repository to Vercel. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in Vercel Environment Variables. Set `FIREBASE_SERVICE_ACCOUNT_JSON` to a service-account JSON string with only the permissions required by the backend. Set `VITE_ORIGIN` or `ALLOWED_ORIGIN` to the storefront origin if restricting CORS. The public key ID can be exposed to the browser; the key secret must never be.

The client must call `/api/create-order` and then `/api/verify-payment`. A successful client-side callback alone is not proof of payment; the backend verifies the Razorpay signature. Shipping rates are not connected yet and must be added before live checkout.

## Suggested deployment
- Frontend: Vercel (same repo) or another static host.
- API: Vercel Functions in `/api`.
- Products and orders: Firestore.
- Product photos: Firebase Storage.

## Before launch
- Replace sample products/photos with real product photography.
- Configure and test Firebase security rules and admin access.
- Implement server-side order persistence and payment-state reconciliation/webhooks.
- Integrate a real shipping/rate provider or publish a clear shipping policy.
- Test payment success, failure, retries, refunds, duplicate callbacks and mobile checkout.
- Have the adult business owner complete Razorpay onboarding/KYC.
