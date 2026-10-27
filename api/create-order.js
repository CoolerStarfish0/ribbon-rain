import { dbAdmin, send, cors, razorpayAuth, getProductLines, validateAddress } from "../lib/api.js";

export default async function handler(req, res) {
  if (!cors(req, res)) return send(res, 403, { error: "Origin not allowed." });
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.setHeader("Allow", "POST, OPTIONS"); return send(res, 405, { error: "Method not allowed." }); }
  try {
    const db = dbAdmin();
    const { key, header } = razorpayAuth();
    if (!process.env.SHIPPING_RATE_API_URL) return send(res, 503, { error: "Checkout is not live yet: a shipping-rate provider must be configured first." });
    const address = validateAddress(req.body?.address);
    const lines = await getProductLines(db, req.body?.items);
    const subtotalInr = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    if (!Number.isSafeInteger(subtotalInr) || subtotalInr < 1) return send(res, 400, { error: "Invalid order total." });
    const shippingResponse = await fetch(process.env.SHIPPING_RATE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.SHIPPING_RATE_API_TOKEN ? { Authorization: "Bearer " + process.env.SHIPPING_RATE_API_TOKEN } : {}) },
      body: JSON.stringify({ destination: address, items: lines.map(({ productId, quantity, unitPrice, lineTotal }) => ({ productId, quantity, unitPrice, lineTotal })), subtotalInr })
    });
    if (!shippingResponse.ok) throw new Error("The shipping provider could not calculate a rate.");
    const shipping = await shippingResponse.json();
    if (shipping.serviceable === false) return send(res, 400, { error: "Delivery is not available for that address yet. Please check the PIN code or contact the shop." });
    const shippingInr = Number(shipping.amountInr);
    if (!Number.isSafeInteger(shippingInr) || shippingInr < 0 || shippingInr > 100000) throw new Error("The shipping provider returned an invalid rate.");
    const totalInr = subtotalInr + shippingInr;
    if (!Number.isSafeInteger(totalInr) || totalInr > 10000000) return send(res, 400, { error: "Order total is outside the supported range." });
    const orderRef = db.collection("orders").doc();
    await orderRef.set({
      createdAt: new Date(), updatedAt: new Date(), status: "creating_payment", paymentStatus: "pending",
      customer: address, items: lines, subtotalInr, shippingInr, shippingQuoteId: String(shipping.quoteId || "").slice(0, 200),
      totalInr, currency: "INR", source: "website"
    });
    try {
      const rpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: header, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalInr * 100, currency: "INR", receipt: orderRef.id.slice(0, 40), notes: { ribbonRainOrderId: orderRef.id } })
      });
      const rp = await rpResponse.json();
      if (!rpResponse.ok || !rp.id) throw new Error("Razorpay could not create a payment order.");
      await orderRef.update({ razorpayOrderId: rp.id, status: "awaiting_payment", updatedAt: new Date() });
      return send(res, 200, { keyId: key, razorpayOrderId: rp.id, internalOrderId: orderRef.id, amount: rp.amount, currency: rp.currency, subtotalInr, shippingInr, totalInr, customer: { name: address.name, email: address.email, contact: address.phone } });
    } catch (error) {
      await orderRef.update({ status: "payment_setup_failed", updatedAt: new Date() });
      throw error;
    }
  } catch (error) {
    console.error("create-order error:", error.message);
    const isInputError = /required|invalid|cart|product|colour|address|PIN|phone|email|empty or too large|not available/i.test(error.message);
    const msg = isInputError ? error.message : "Could not prepare checkout. Please try again later.";
    return send(res, isInputError ? 400 : 500, { error: msg });
  }
}