import { NextResponse } from "next/server";
import { findPaymentLedgerRow, updatePaymentLedgerRow } from "@/lib/payment-ledger";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const receivedSecret = request.headers.get("x-zetupay-secret");
  const expectedSecret = process.env.ZETUPAY_SECRET_KEY;
  
  console.error("[ZetuPay Webhook] Secret check:", {
    received: receivedSecret ? "present" : "missing",
    expected: expectedSecret ? "present" : "missing",
    match: receivedSecret === expectedSecret
  });

  if (receivedSecret !== expectedSecret) {
    console.error("[ZetuPay Webhook] Secret mismatch - returning 401");
    return new NextResponse("Invalid webhook secret", { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  console.error("[ZetuPay Webhook] Raw payload:", JSON.stringify(payload));

  const data = payload?.data;
  console.error("[ZetuPay Webhook] Data extraction:", {
    hasPayload: !!payload,
    hasData: !!data,
    hasReference: !!data?.reference,
    reference: data?.reference,
    payloadKeys: payload ? Object.keys(payload) : [],
    dataKeys: data ? Object.keys(data) : []
  });

  if (!data?.reference) {
    console.error("[ZetuPay Webhook] Missing reference - returning 400");
    return new NextResponse("Invalid webhook payload", { status: 400 });
  }

  const ledgerRow = await findPaymentLedgerRow(data.reference);
  if (!ledgerRow) return new NextResponse("Ledger row not found", { status: 404 });

  console.error("[ZETUPAY WEBHOOK] Updating payment ledger via webhook", {
    timestamp: new Date().toISOString(),
    reference: data.reference,
    status: data.status || payload.event?.replace("payment.", "") || "pending",
    path: "WEBHOOK"
  });

  await updatePaymentLedgerRow(ledgerRow.$id, {
    status: data.status || payload.event?.replace("payment.", "") || "pending",
    receiptNumber: data.receiptNumber || ledgerRow.data.receiptNumber || "",
    checkoutRequestId: data.checkoutRequestId || ledgerRow.data.checkoutRequestId || "",
    mpesaResultCode: Number.isInteger(data.mpesaResultCode) ? data.mpesaResultCode : ledgerRow.data.mpesaResultCode || 0,
    feeKes: data.fee ?? ledgerRow.data.feeKes ?? 0,
    netKes: data.net ?? ledgerRow.data.netKes ?? 0,
    updatedAt: new Date().toISOString(),
  });

  console.error("[ZETUPAY WEBHOOK] Ledger updated - NOTE: Webhook does NOT credit balance, polling endpoint does that");

  return NextResponse.json({ received: true });
}