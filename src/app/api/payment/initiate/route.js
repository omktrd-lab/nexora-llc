import { NextResponse } from "next/server";
import { createPaymentLedgerRow } from "@/lib/payment-ledger";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const zetupayEndpoint = "https://pay.zetupay.co.ke/api/v1/payment/initiate";

function jsonError(message, status) {
  return NextResponse.json({ message }, { status });
}

function toInternationalPhone(phoneNumber) {
  if (phoneNumber.startsWith("0")) {
    return `254${phoneNumber.slice(1)}`;
  }
  return phoneNumber;
}

export async function POST(request) {
  const authorization = request.headers.get("authorization");
  const jwt = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  console.error("[PAYMENT INITIATE] Starting payment initiation", {
    hasJwt: !!jwt,
    zetupayKeyPresent: !!process.env.ZETUPAY_SECRET_KEY,
  });

  if (!jwt) {
    return jsonError("You must be signed in to start a payment.", 401);
  }

  if (!process.env.ZETUPAY_SECRET_KEY) {
    return jsonError("ZetuPay is not configured on the server.", 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("The payment request was invalid.", 400);
  }

  const amount = Number(body.amount);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    return jsonError("Enter a valid amount in KES.", 400);
  }

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
    const currentUser = await new Account(appwriteClient).get();
    const phoneNumber = currentUser.prefs?.safaricomPhoneNumber;

    console.error("[PAYMENT INITIATE] User authenticated", {
      userId: currentUser.$id,
      phoneNumber,
      amount,
    });

    if (!/^(01|07)\d{8}$/.test(phoneNumber || "")) {
      return jsonError("Add a valid M-Pesa number before funding.", 400);
    }

    const reference = `NXR-${currentUser.$id}-${Date.now()}`;
    console.error("[PAYMENT INITIATE] Calling ZetuPay initiate API", { reference });

    const upstream = await fetch(zetupayEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ZETUPAY_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        phoneNumber,
        reference,
        redirectUrl: new URL("/", request.url).origin,
        currency: "KES",
      }),
    });

    const responseText = await upstream.text();
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { message: "ZetuPay returned an invalid response." };
    }

    console.error("[PAYMENT INITIATE] ZetuPay initiate response", {
      status: upstream.status,
      ok: upstream.ok,
      hasData: !!responseBody.data,
    });

    if (!upstream.ok) {
      return NextResponse.json(responseBody, { status: upstream.status });
    }

    const payment = responseBody.data;
    let directStk = false;
    let directStkError = null;
    let directResponse = {};

    let appId = payment?.appId;
    if (!appId && payment?.paymentKey) {
      const statusResponse = await fetch(
        `https://pay.zetupay.co.ke/api/v1/payment/${payment.paymentKey}`,
      );
      const statusBody = await statusResponse.json();
      appId = statusBody.data?.application?.appId;
    }

    if (appId && payment?.waveTransactionId) {
      const checkoutUrl = payment.checkoutUrl || "https://www.zetupay.co.ke/checkout/v1";
      const stkResponse = await fetch("https://www.zetupay.co.ke/api/mpesa-stk", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: "https://www.zetupay.co.ke",
          Referer: checkoutUrl,
        },
        body: JSON.stringify({
          amount,
          phoneNumber: toInternationalPhone(phoneNumber),
          reference,
          appId,
          waveTransactionId: payment.waveTransactionId,
          identifier: currentUser.$id,
        }),
      });
      const directResponseText = await stkResponse.text();
      try {
        directResponse = JSON.parse(directResponseText);
      } catch {
        directResponse = {};
      }
      directStk = stkResponse.ok && Boolean(directResponse.CheckoutRequestID);
      if (!directStk) {
        directStkError = directResponse.message || directResponse.error || `ZetuPay STK request failed (${stkResponse.status}).`;
      }
    } else {
      directStkError = "ZetuPay did not return the identifiers required for direct STK.";
    }

    const ledgerRow = await createPaymentLedgerRow({
      userId: currentUser.$id,
      data: {
        userId: currentUser.$id,
        reference,
        paymentKey: payment?.paymentKey || "",
        waveTransactionId: payment?.waveTransactionId || "",
        phoneNumber: toInternationalPhone(phoneNumber),
        amountKes: amount,
        currency: "KES",
        status: directStk ? "processing" : "pending",
        receiptNumber: "",
        checkoutRequestId: directResponse.CheckoutRequestID || "",
        mpesaResultCode: 0,
        feeKes: 0,
        netKes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      ...responseBody,
      reference,
      data: { ...payment, directStk, directStkError, ledgerRowId: ledgerRow.$id },
    });
  } catch (error) {
    console.error("[PAYMENT INITIATE] ERROR", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return jsonError("Could not start the ZetuPay payment.", 502);
  }
}