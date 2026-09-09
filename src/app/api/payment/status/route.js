import { Account, Client } from "appwrite";
import { NextResponse } from "next/server";
import { getPaymentLedgerRow, updatePaymentLedgerRow } from "@/lib/payment-ledger";

const statusEndpoint = "https://pay.zetupay.co.ke/api/v1/payment";

function jsonError(message, status) {
  return NextResponse.json({ message }, { status });
}

export async function GET(request) {
  const authorization = request.headers.get("authorization");
  const jwt = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const paymentKey = new URL(request.url).searchParams.get("paymentKey");
  const ledgerRowId = new URL(request.url).searchParams.get("ledgerRowId");

  if (!jwt) return jsonError("You must be signed in.", 401);
  if (!paymentKey) return jsonError("A payment key is required.", 400);

  try {
    const appwriteClient = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setJWT(jwt);
    const currentUser = await new Account(appwriteClient).get();
    const response = await fetch(`${statusEndpoint}/${encodeURIComponent(paymentKey)}`);
    const result = await response.json();
    const reference = result.data?.reference || "";

    if (!reference.startsWith(`NXR-${currentUser.$id}-`)) {
      return jsonError("This payment does not belong to the signed-in user.", 403);
    }

    if (ledgerRowId) {
      const ledgerRow = await getPaymentLedgerRow(ledgerRowId);
      if (ledgerRow.data?.userId !== currentUser.$id) {
        return jsonError("This ledger row does not belong to the signed-in user.", 403);
      }
      const paymentData = result.data || {};
      await updatePaymentLedgerRow(ledgerRowId, {
        status: paymentData.status || "pending",
        receiptNumber: paymentData.receiptNumber || ledgerRow.data.receiptNumber || "",
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(result, { status: response.status });
  } catch {
    return jsonError("Could not read the payment status.", 502);
  }
}