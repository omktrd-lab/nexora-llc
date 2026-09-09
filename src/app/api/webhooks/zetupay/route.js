import { NextResponse } from "next/server";
import { findPaymentLedgerRow, updatePaymentLedgerRow } from "@/lib/payment-ledger";

export async function POST(request) {
  if (request.headers.get("x-zetupay-secret") !== process.env.ZETUPAY_SECRET_KEY) {
    return new NextResponse("Invalid webhook secret", { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const data = payload?.data;
  if (!data?.reference) {
    return new NextResponse("Invalid webhook payload", { status: 400 });
  }

  const ledgerRow = await findPaymentLedgerRow(data.reference);
  if (!ledgerRow) return new NextResponse("Ledger row not found", { status: 404 });

  await updatePaymentLedgerRow(ledgerRow.$id, {
    status: data.status || payload.event?.replace("payment.", "") || "pending",
    receiptNumber: data.receiptNumber || ledgerRow.data.receiptNumber || "",
    checkoutRequestId: data.checkoutRequestId || ledgerRow.data.checkoutRequestId || "",
    mpesaResultCode: Number.isInteger(data.mpesaResultCode) ? data.mpesaResultCode : ledgerRow.data.mpesaResultCode || 0,
    feeKes: data.fee ?? ledgerRow.data.feeKes ?? 0,
    netKes: data.net ?? ledgerRow.data.netKes ?? 0,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ received: true });
}