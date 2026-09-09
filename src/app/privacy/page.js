export const metadata = {
  title: "Privacy Policy | Nexora",
  description: "Nexora privacy policy",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-16 text-foreground sm:px-10">
      <article className="prose prose-neutral max-w-none">
        <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: September 2026</p>

        <p className="mt-10 leading-7">
          Nexora ("we", "us", or "our") operates the Nexora application. This
          page explains what information we collect from you and how we use it.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">Information We Collect</h2>
        <p className="mt-4 leading-7">
          When you sign in with Google, we receive your name and email address
          from your Google account. We do not request or receive access to your
          Gmail, Google Drive, or any other Google service.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">How We Use Your Information</h2>
        <p className="mt-4 leading-7">
          We use your name and email solely to create and manage your account
          within Nexora, so you can sign in and use the app. We do not sell,
          rent, or share your personal information with third parties for
          marketing purposes.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">Data Storage</h2>
        <p className="mt-4 leading-7">
          Your account information is stored securely using Appwrite, our
          backend service provider.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">Your Rights</h2>
        <p className="mt-4 leading-7">
          You may request deletion of your account and associated data at any
          time by contacting us at the email address below.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">Changes to This Policy</h2>
        <p className="mt-4 leading-7">
          We may update this privacy policy from time to time. Changes will be
          posted on this page.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">Contact Us</h2>
        <p className="mt-4 leading-7">
          If you have any questions about this privacy policy, please contact
          us at{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:brianitira@gmail.com"
          >
            brianitira@gmail.com
          </a>
          .
        </p>
      </article>
    </main>
  );
}
