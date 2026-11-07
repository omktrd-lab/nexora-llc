import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function failureRedirect(request, message) {
  const url = new URL("/auth", request.url);
  url.searchParams.set(
    "error",
    JSON.stringify({
      message,
      type: "user_oauth2_provider_error",
      code: 502,
    }),
  );
  return NextResponse.redirect(url);
}

export async function GET(request) {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!endpoint || !projectId) {
    return failureRedirect(request, "Appwrite is not configured.");
  }

  const requestUrl = new URL(request.url);
  const ref = requestUrl.searchParams.get("ref");
  const successUrl = new URL("/auth/callback", requestUrl.origin);
  if (ref) successUrl.searchParams.set("ref", ref);
  const failureUrl = new URL("/auth", requestUrl.origin);

  const oauthUrl = new URL(`${endpoint}/account/tokens/oauth2/google`);
  oauthUrl.searchParams.set("project", projectId);
  oauthUrl.searchParams.set("success", successUrl.toString());
  oauthUrl.searchParams.set("failure", failureUrl.toString());

  try {
    // Ask Appwrite for the Google URL from this server, with no browser session.
    // Appwrite 2.7 otherwise binds the login to a leftover cookie on
    // fra.cloud.appwrite.io and rejects the real account as user_already_exists.
    const upstream = await fetch(oauthUrl, {
      redirect: "manual",
      cache: "no-store",
      headers: { Accept: "text/html" },
    });
    const location = upstream.headers.get("location");
    if (!location || !location.startsWith("https://accounts.google.com/")) {
      return failureRedirect(request, "Google sign-in could not be started.");
    }
    return NextResponse.redirect(location);
  } catch {
    return failureRedirect(request, "Google sign-in could not be started.");
  }
}
