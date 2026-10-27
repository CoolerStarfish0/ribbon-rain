import crypto from "node:crypto";
import { dbAdmin, send, cors, razorpayAuth, timingSafeHexEqual } from "./_lib.js";

export default async function handler(req, res) {
  if (!cors(req, res)) return send(res, 403, { error: "Origin not allowed." });
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.setHeader("Allow", "POST, OPTIONS"); return send(res, 405, { error: "Method not allowed." }); }
  try {
    const { secret, header } = razorpayAuth();
    const { razorpay_order_id: paymentOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature, internalOrderId } = req.body || {};
    if (![paymentOrderId, paymentId, signature, internalOrderId].every(x => typeof x === "string" && x.length > 0 && x.length < 300)) return send(res, 400, { error: "Payment verification details are incomplete." });
    const expected = crypto.createHmac("sha256", secret).update(paymentOrderId + "|" + paymentId).digest("hex");
    if (!timingSafeHexEqual(expected, signature)) return send(res, 400, { error: "Payment signature is invalid." });
    const db = dbAdmin();
    const orderRef = db.collection("orders").doc(internalOrderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return send(res, 404, { error: "Order not found." });
    const order = orderSnap.data();
    if (order.razorpayOrderId !== paymentOrderId) return send(res, 400, { error: "Payment does not match this order." });
    if (order.paymentStatus === "paid" && order.razorpayPaymentId === paymentId) return send(res, 200, { ok: true, orderId: internalOrderId, message: "Payment already verified." });
    const paymentResponse = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), { headers: { Authorization: header } });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok || payment.order_id !== paymentOrderId || payment.currency !== "INR" || payment.amount !== order.totalInr * 100 || payment.status !== "captured") {
      return send(res, 400, { error: "Payment is not confirmed as captured. If money was deducted, contact the shop with your payment reference." });
    }
    await orderRef.update({ status: "paid", paymentStatus: "paid", razorpayPaymentId: paymentId, paymentVerifiedAt: new Date(), updatedAt: new Date() });
    return send(res, 200, { ok: true, orderId: internalOrderId, message: "Payment verified." });
  } catch (error) {
    console.error("verify-payment error:", error.message);
    return send(res, 500, { error: "We could not verify the payment right now. Please keep your payment reference and contact the shop." });
  }
}