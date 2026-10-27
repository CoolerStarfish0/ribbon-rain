# Ribbon Rain

**Made with love, wrapped in ribbons.**

A cute, premium-minimal storefront for stickers and school labels, with warm white, charcoal, soft pink and lavender styling.

## What's in this repository

- Responsive storefront with category filters, search, product details, available-colour choices, persistent bag/cart and delivery form.
- Firebase Firestore catalogue: published products load automatically.
- Shop-owner dashboard at /admin/: Google sign-in, product create/edit, publish/draft control, price and description edits, allowed colour options, and multiple image uploads to Firebase Storage (first new image becomes the main photo).
- Admin order list with payment state, customer/delivery details and fulfilment-status updates.
- Firestore and Storage security rules.
- Vercel API scaffolding for server-side product/colour/price validation, shipping quote requests, Razorpay order creation, payment signature + captured-payment verification, and signed webhook reconciliation.

## Important: not live yet

The code is committed, but the shop is **not ready to accept real orders** until you configure Firebase, deploy to Vercel, set server environment variables, connect a real shipping-rate provider, configure Razorpay and test end-to-end. No credentials have been added to this repository. Do not announce the shop as open or accept payments until setup and tests are complete.

## 1. Firebase setup

1. Create a Firebase project and register a Web App.
2. Copy the Web App configuration into firebase-client.js, replacing the REPLACE_... placeholders. These browser config values are not service-account secrets.
3. Enable Google as a sign-in provider in Firebase Authentication.
4. Create Firestore Database and Firebase Storage.
5. In a trusted local environment, install dependencies with npm install and configure the Firebase CLI for the project.
6. Deploy the security rules: npm run deploy:rules.
7. Create a service-account key for trusted setup/backend use and keep it outside the repository. Set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel to the service-account JSON string.
8. Grant the adult shop owner account the admin: true Firebase Auth custom claim using the trusted script below. Never add an admin button that grants claims from the browser.

Example PowerShell from the project folder, after you have securely downloaded the service account JSON to a local file named service-account-local.json (this filename is ignored by Git):

    $env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content .\service-account-local.json -Raw
    $env:ADMIN_EMAIL = "the-shop-owner-google-email@example.com"
    npm run set:admin

The shop owner should then sign out and sign back in. Use the actual adult owner's Google email; do not use a placeholder literally. Keep the service-account file private and never upload it to GitHub.

## 2. Vercel and checkout setup

Import this repository into Vercel and deploy it. The root contains the static storefront and /api contains Vercel Functions. Set these Environment Variables in Vercel (Production, Preview and Development as appropriate):

- FIREBASE_SERVICE_ACCOUNT_JSON — trusted Firebase service account JSON; server-side only.
- RAZORPAY_KEY_ID — Razorpay key ID.
- RAZORPAY_KEY_SECRET — Razorpay secret; server-side only.
- RAZORPAY_WEBHOOK_SECRET — a webhook secret you set in Razorpay Dashboard.
- SHIPPING_RATE_API_URL — URL for a real shipping quote adapter.
- SHIPPING_RATE_API_TOKEN — optional bearer token for that adapter.
- ALLOWED_ORIGIN — required exact storefront origin, such as https://your-project.vercel.app. Browser checkout requests are rejected if this is missing or does not match.

The shipping adapter must accept a POST JSON body shaped like { "destination": { "...": "..." }, "items": [{ "productId": "...", "quantity": 1, "unitPrice": 100, "lineTotal": 100 }], "subtotalInr": 100 } and return { "amountInr": 40, "quoteId": "optional-provider-quote-id", "serviceable": true }. Return serviceable: false when the address cannot be delivered to. This is an integration contract, **not a working shipping provider**. Implement/adapt it to the courier aggregator you choose, including PIN-code serviceability and address/order-based rates. Until a real adapter is configured, checkout deliberately returns an unavailable message.

Configure the Razorpay webhook URL as https://YOUR-VERCEL-DOMAIN/api/razorpay-webhook and subscribe to payment.captured and/or order.paid. Use Razorpay test mode first. The adult business owner must complete Razorpay onboarding/KYC before live payments.

The checkout API reads product prices and allowed colours from Firestore instead of trusting browser totals. It verifies the Razorpay signature and checks the payment is captured. The webhook provides a backup path if the customer closes the browser after paying. API secrets must never be placed in firebase-client.js, script.js, or any HTML file.

## 3. Admin dashboard

Open /admin/ after deployment. Only Firebase users with the trusted admin: true custom claim can access product writes, image uploads, and order management. Images are limited to JPG, PNG or WebP up to 5 MB. Each product needs a main photo, a price, description, category, and at least one allowed colour. Customers can select from those colours but cannot change the design itself.

Orders are created by the server and are visible to admins. Fulfilment status is stored separately from payment status. Customer-facing order tracking, email notifications, returns/refunds, stock management and courier labels are not implemented yet.

## 4. Local preview

Opening index.html directly gives a visual preview with illustrative sample products. For Firebase and Vercel API testing, run npm install and npm run dev, and configure the services above. The sample product IDs are not real Firestore products, so checkout should not succeed against a configured backend until actual products have been added in /admin/.

## Before launch

- Replace sample items with your own product photography, names, descriptions and prices.
- Verify Firebase Authentication, Firestore rules, Storage rules and the owner custom claim.
- Connect and test a real shipping-rate provider.
- Use Razorpay test mode to test success, failure, retries, webhook reconciliation and duplicate callbacks.
- Check order totals, allowed colours, PIN-code serviceability, mobile checkout, cancellation and refund procedures.
- Configure customer order confirmations/notifications and a clear privacy, shipping, returns and contact policy.
- Have the adult business owner review and complete payment-provider requirements.
