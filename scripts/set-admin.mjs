import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const email = process.env.ADMIN_EMAIL;
if (!raw || !email) {
  console.error("Set FIREBASE_SERVICE_ACCOUNT_JSON and ADMIN_EMAIL in your local environment before running this script.");
  process.exit(1);
}
const app = initializeApp({ credential: cert(JSON.parse(raw)) });
const auth = getAuth(app);
const user = await auth.getUserByEmail(email);
const claims = { ...(user.customClaims || {}), admin: true };
await auth.setCustomUserClaims(user.uid, claims);
console.log("Granted admin: true to", user.email, "(", user.uid, "). The user must sign out and sign in again, or refresh their ID token.");
console.log("Run this trusted script only for the adult shop owner. Never expose service-account credentials in the browser or repository.");