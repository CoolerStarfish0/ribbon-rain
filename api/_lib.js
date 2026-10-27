import crypto from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function send(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.json(data);
}
export function cors(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin;
  if (allowed && origin && origin !== allowed) return false;
  if (allowed) res.setHeader("Access-Control-Allow-Origin", allowed);
  else if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return true;
}
export function dbAdmin() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}
export function timingSafeHexEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b)) return false;
  const left = Buffer.from(a, "hex"), right = Buffer.from(b, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
export function requiredEnv(names) {
  return names.filter(name => !process.env[name]);
}
export function razorpayAuth() {
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) throw new Error("Razorpay API credentials are not configured.");
  return { key, secret, header: "Basic " + Buffer.from(key + ":" + secret).toString("base64") };
}
export async function getProductLines(db, items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 40) throw new Error("The cart is empty or too large.");
  const lines = [];
  for (const item of items) {
    if (!item || typeof item.productId !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50 || typeof item.colour !== "string") throw new Error("A cart item is invalid.");
    const snap = await db.collection("products").doc(item.productId).get();
    if (!snap.exists) throw new Error("A product in your cart is no longer available.");
    const p = snap.data();
    if (p.published !== true) throw new Error("A product in your cart is not available.");
    if (!Array.isArray(p.colours) || !p.colours.includes(item.colour)) throw new Error("A selected colour is not available for this product.");
    const price = Number(p.price);
    if (!Number.isSafeInteger(price) || price < 1) throw new Error("A product has an invalid price. Contact the shop.");
    lines.push({ productId: snap.id, name: String(p.name || "Ribbon Rain product").slice(0, 100), quantity: item.quantity, colour: item.colour, unitPrice: price, lineTotal: price * item.quantity, imageUrl: String(p.imageUrl || "").slice(0, 2000) });
  }
  return lines;
}
export function validateAddress(a) {
  if (!a || typeof a !== "object") throw new Error("Delivery address is required.");
  const fields = ["name","email","phone","address","city","pincode","state"];
  const out = {};
  for (const field of fields) {
    const value = String(a[field] || "").trim();
    if (!value || value.length > (field === "address" ? 240 : 100)) throw new Error("Please check the delivery " + field + ".");
    out[field] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) throw new Error("Enter a valid email address.");
  if (!/^[0-9]{6}$/.test(out.pincode)) throw new Error("Enter a valid six-digit PIN code.");
  if (!/^[0-9+ ()-]{8,18}$/.test(out.phone)) throw new Error("Enter a valid phone number.");
  return out;
}