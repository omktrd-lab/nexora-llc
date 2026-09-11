import { Account, Client } from "appwrite";
import { NextResponse } from "next/server";
import {
  getPaymentLedgerRow,
  updatePaymentLedgerRow,
} from "@/lib/payment-ledger";
import { validateReferral } from "@/lib/referrals";

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
    const account = new Account(appwriteClient);
    const currentUser = await account.get();
    const response = await fetch(
      `${statusEndpoint}/${encodeURIComponent(paymentKey)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ZETUPAY_SECRET_KEY}`,
          Accept: "application/json",
        },
      },
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          message: result.message || "Could not read the payment status.",
          ...(result.data ? { data: result.data } : {}),
        },
        { status: response.status },
      );
    }

    const reference = result.data?.reference || "";
    let ledgerRow = null;

    if (ledgerRowId) {
      ledgerRow = await getPaymentLedgerRow(ledgerRowId);
      const ledgerData = ledgerRow.data || ledgerRow;
      if (ledgerData.userId !== currentUser.$id) {
        return jsonError(
          "This ledger row does not belong to the signed-in user.",
          403,
        );
      }
    }

    const matchesReference = reference.startsWith(`NXR-${currentUser.$id}-`);
    if (!matchesReference && !ledgerRow) {
      return jsonError(
        "This payment does not belong to the signed-in user.",
        403,
      );
    }

    if (ledgerRowId && ledgerRow) {
      const paymentData = result.data || {};
      const ledgerData = ledgerRow.data || ledgerRow;
      const paymentStatus = String(
        paymentData.status || "pending",
      ).toLowerCase();
      const amountKes = Number(ledgerData.amountKes || paymentData.amount || 0);

      await updatePaymentLedgerRow(ledgerRowId, {
        status: paymentStatus,
        receiptNumber:
          paymentData.receiptNumber || ledgerData.receiptNumber || "",
        updatedAt: new Date().toISOString(),
      });

      if (
        paymentStatus === "success" &&
        currentUser.prefs?.lastTopUpReference !== reference
      ) {
        const existingPrefs = currentUser.prefs || {};
        const currentBalance = Number(existingPrefs.balanceKes || 0);
        const nextBalance = currentBalance + amountKes;
        const creditedAt = new Date().toISOString();
        const prefsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/users/${encodeURIComponent(currentUser.$id)}/prefs`,
          {
            method: "PATCH",
            headers: {
              "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
              "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prefs: {
                ...existingPrefs,
                balanceKes: nextBalance,
                totalDepositedKes:
                  Number(existingPrefs.totalDepositedKes || 0) + amountKes,
                lastTopUpAt: creditedAt,
                lastTopUpReference: reference,
              },
            }),
          },
        );

        if (!prefsResponse.ok) {
          throw new Error("Appwrite balance update failed.");
        }

        // Validate referral if user has a pending referral and deposited >= 1 KES
        if (amountKes >= 1) {
          try {
            await validateReferral(currentUser.$id, amountKes);
          } catch (error) {
            console.error("Failed to validate referral:", error);
            // Don't fail the payment if referral validation fails
          }
        }
      }
    }

    return NextResponse.json(result, { status: response.status });
  } catch {
    return jsonError("Could not read the payment status.", 502);
  }
}
