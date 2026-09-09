const ledgerEndpoint = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/tablesdb/${process.env.APPWRITE_DATABASE_ID}/tables/${process.env.APPWRITE_PAYMENT_LEDGER_ID}`;

function headers() {
  return {
    "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
    "Content-Type": "application/json",
  };
}

async function appwriteRequest(path, options = {}) {
  if (!process.env.APPWRITE_API_KEY) {
    throw new Error("Appwrite server API key is not configured.");
  }

  const response = await fetch(`${ledgerEndpoint}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Appwrite ledger request failed.");
  }
  return result;
}

export function createPaymentLedgerRow({ userId, data }) {
  return appwriteRequest("/rows", {
    method: "POST",
    body: JSON.stringify({
      rowId: "unique()",
      data,
      permissions: [`read("user:${userId}")`],
    }),
  });
}

export function updatePaymentLedgerRow(rowId, data) {
  return appwriteRequest(`/rows/${encodeURIComponent(rowId)}`, {
    method: "PATCH",
    body: JSON.stringify({ data }),
  });
}

export function getPaymentLedgerRow(rowId) {
  return appwriteRequest(`/rows/${encodeURIComponent(rowId)}`);
}

export function findPaymentLedgerRow(reference) {
  const query = encodeURIComponent(`equal("reference",["${reference}"])`);
  return appwriteRequest(`/rows?queries[]=${query}&limit=1`).then(
    (result) => result.rows?.[0] || null,
  );
}