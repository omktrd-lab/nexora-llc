function getLedgerEndpoint() {
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/tablesdb/${process.env.APPWRITE_DATABASE_ID}/tables/${process.env.APPWRITE_PAYMENT_LEDGER_ID}`;
}

function getHeaders() {
  return {
    "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
    "Content-Type": "application/json",
  };
}

async function appwriteRequest(path, options = {}) {
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) {
    throw new Error("Appwrite server API key is not configured.");
  }

  const response = await fetch(`${getLedgerEndpoint()}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
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