import crypto from "node:crypto";
import { dbAdmin } from "../lib/api.js";

export const config = { api: { bodyParser: false } };
async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
export default async function handler(req, res) {
  if (req.method !== "POST") { res.statusCode = 405; res.setHeader("Allow", "POST"); res.end("Method not allowed"); return; }
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) { res.statusCode = 503; res.end("Webhook is not configured"); return; }
  try {
    const raw = await rawBody(req);
    const signature = req.headers["x-razorpay-signature"];
    if (typeof signature !== "string") { res.statusCode = 400; res.end("Missing signature"); return; }
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const left = Buffer.from(expected, "hex"), right = /^[a-f0-9]+$/i.test(signature) ? Buffer.from(signature, "hex") : Buffer.alloc(0);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) { res.statusCode = 400; res.end("Invalid signature"); return; }
    const event = JSON.parse(raw.toString("utf8"));
    let payment = null, razorpayOrderId = null;
    if (event.event === "payment.captured") {
      payment = event.payload?.payment?.entity;
      razorpayOrderId = payment?.order_id;
    } else if (event.event === "order.paid") {
      payment = event.payload?.payment?.entity;
      razorpayOrderId = event.payload?.order?.entity?.id || payment?.order_id;
    } else {
      res.statusCode = 200; res.end("Ignored event"); return;
    }
    if (!razorpayOrderId || !payment) { res.statusCode = 200; res.end("No payment payload"); return; }
    const db = dbAdmin();
    const matches = await db.collection("orders").where("razorpayOrderId", "==", razorpayOrderId).limit(1).get();
    if (matches.empty) { res.statusCode = 200; res.end("No matching order"); return; }
    const orderDoc = matches.docs[0], order = orderDoc.data();
    if (payment.status !== "captured" || payment.amount !== order.totalInr * 100 || payment.currency !== "INR") { res.statusCode = 200; res.end("Payment not captured or amount mismatch"); return; }
    if (order.paymentStatus !== "paid") await orderDoc.ref.update({ status: "paid", paymentStatus: "paid", razorpayPaymentId: payment.id, paymentVerifiedAt: new Date(), updatedAt: new Date() });
    res.statusCode = 200; res.end("OK");
  } catch (error) {
    console.error("Razorpay webhook error:", error.message);
    res.statusCode = 500; res.end("Webhook processing failed");
  }
}