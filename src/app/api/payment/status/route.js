import { NextResponse } from "next/server";
import {
  getPaymentLedgerRow,
  updatePaymentLedgerRow,
} from "@/lib/payment-ledger";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

function jsonError(message, status) {
  return NextResponse.json({ message }, { status });
}

export async function GET(request) {
  const statusEndpoint = "https://pay.zetupay.co.ke/api/v1/payment";
  const authorization = request.headers.get("authorization");
  const jwt = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const paymentKey = new URL(request.url).searchParams.get("paymentKey");
  const ledgerRowId = new URL(request.url).searchParams.get("ledgerRowId");

  console.error("[PAYMENT STATUS] Starting status check", {
    timestamp: new Date().toISOString(),
    hasPaymentKey: !!paymentKey,
    hasLedgerRowId: !!ledgerRowId,
    hasJwt: !!jwt,
    zetupayKeyPresent: !!process.env.ZETUPAY_SECRET_KEY,
    appwriteKeyPresent: !!process.env.APPWRITE_API_KEY,
  });

  if (!jwt) return jsonError("You must be signed in.", 401);
  if (!paymentKey) return jsonError("A payment key is required.", 400);

  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    if (!endpoint || !projectId) {
      return jsonError("Appwrite is not configured on the server.", 503);
    }

    const { Account, Client } = await import("appwrite");
    const appwriteClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setJWT(jwt);
    const account = new Account(appwriteClient);
    const currentUser = await account.get();

    console.error("[PAYMENT STATUS] User authenticated", {
      userId: currentUser.$id,
      paymentKey,
      ledgerRowId,
    });

    const response = await fetch(
      `${statusEndpoint}/${encodeURIComponent(paymentKey)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ZETUPAY_SECRET_KEY}`,
          Accept: "application/json",
        },
      },
    );

    console.error("[PAYMENT STATUS] ZetuPay API response", {
      status: response.status,
      ok: response.ok,
    });

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
      const rawStatus = String(paymentData.status || "pending");
      const paymentStatus = rawStatus.toLowerCase();
      const successStatuses = new Set([
        "success",
        "successful",
        "completed",
        "complete",
        "paid",
        "succeeded",
      ]);
      const isSuccessfulPayment = successStatuses.has(paymentStatus);
      const amountKes = Number(ledgerData.amountKes || paymentData.amount || 0);

      await updatePaymentLedgerRow(ledgerRowId, {
        status: paymentStatus,
        receiptNumber:
          paymentData.receiptNumber || ledgerData.receiptNumber || "",
        updatedAt: new Date().toISOString(),
      });

      if (isSuccessfulPayment && currentUser.prefs?.lastTopUpReference !== reference) {
        console.error("[PAYMENT STATUS POLLING] Crediting balance via polling endpoint", {
          timestamp: new Date().toISOString(),
          userId: currentUser.$id,
          amountKes,
          reference,
          paymentKey,
          ledgerRowId,
          path: "POLLING"
        });
        const existingPrefs = currentUser.prefs || {};
        const currentBalance = Number(existingPrefs.balanceKes || 0);
        const nextBalance = currentBalance + amountKes;
        const creditedAt = new Date().toISOString();
        console.error("[PAYMENT STATUS] Attempting to credit balance", {
          currentBalance,
          nextBalance,
          amountKes,
          reference,
        });

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

        console.error("[PAYMENT STATUS] Appwrite balance update response", {
          status: prefsResponse.status,
          ok: prefsResponse.ok,
        });

        if (!prefsResponse.ok) {
          console.error("[PAYMENT STATUS] Appwrite balance update FAILED");
          throw new Error("Appwrite balance update failed.");
        }

        console.error("[PAYMENT STATUS] Balance credited successfully");

        if (amountKes >= 1) {
          try {
            console.error("[PAYMENT STATUS] Validating referral", {
              userId: currentUser.$id ? currentUser.$id.substring(0, 8) + "..." : null,
              amountKes,
            });

            const databaseId = process.env.APPWRITE_DATABASE_ID;
            const referralsCollectionId = process.env.NEXT_PUBLIC_REFERRALS_COLLECTION_ID || "referrals";

            const { Client, Databases, Query } = await import("node-appwrite");
            const client = new Client()
              .setEndpoint(endpoint)
              .setProject(projectId)
              .setKey(process.env.APPWRITE_API_KEY);

            const databases = new Databases(client);

            const response = await databases.listDocuments(
              databaseId,
              referralsCollectionId,
              [
                Query.equal('referredUserId', currentUser.$id),
                Query.equal('status', 'PENDING')
              ]
            );

            console.error("[PAYMENT STATUS] Pending referrals found", {
              count: response.documents.length,
            });

            if (response.documents.length > 0) {
              const referral = response.documents[0];
              const updated = await databases.updateDocument(
                databaseId,
                referralsCollectionId,
                referral.$id,
                {
                  status: 'VALID',
                  hasDeposited: true,
                  depositAmount: amountKes,
                }
              );

              console.error("[PAYMENT STATUS] Referral updated successfully", {
                referralId: updated.$id,
                status: updated.status,
              });
            }
          } catch (error) {
            console.error("[PAYMENT STATUS] Failed to validate referral:", error);
          }
        }
      } else if (!isSuccessfulPayment) {
        console.warn("ZetuPay payment status not marked successful yet", {
          paymentKey,
          rawStatus,
          reference,
          ledgerRowId,
        });
      }
    }

    return NextResponse.json(result, { status: response.status });
  } catch {
    return jsonError("Could not read the payment status.", 502);
  }
}
