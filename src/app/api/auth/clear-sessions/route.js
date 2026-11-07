import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message, status) {
  return NextResponse.json({ message }, { status });
}

function cookieFallbackFrom(response, body) {
  const header = response.headers.get("x-fallback-cookies");
  if (header) return header;
  const sessionSecret = body?.secret;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!sessionSecret || !projectId) return "";
  return JSON.stringify({ [`a_session_${projectId}`]: sessionSecret });
}

async function probeToken(userId, secret) {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const response = await fetch(`${endpoint}/account/sessions/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
    },
    body: JSON.stringify({ userId, secret }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("The sign-in request was invalid.", 400);
  }

  const userId = String(body.userId || "");
  const secret = String(body.secret || "");
  if (!userId || !secret) {
    return jsonError("A sign-in token is required.", 400);
  }

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) {
    return jsonError("Appwrite is not configured on the server.", 503);
  }

  try {
    const probe = await probeToken(userId, secret);
    if (probe.response.ok) {
      const cookieFallback = cookieFallbackFrom(probe.response, probe.body);
      if (!cookieFallback) {
        return jsonError("The sign-in session could not be stored.", 502);
      }
      return NextResponse.json({ cookieFallback });
    }

    if (probe.body?.type !== "user_session_already_exists") {
      return jsonError("The Google sign-in token is no longer valid.", 401);
    }

    const { Client, Users } = await import("node-appwrite");
    const users = new Users(
      new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
    );
    await users.deleteSessions(userId);

    return NextResponse.json({ cleared: true });
  } catch (error) {
    console.error(
      "Could not clear old sign-in sessions:",
      error instanceof Error ? error.message : error,
    );
    return jsonError("Could not free an old sign-in session.", 502);
  }
}
