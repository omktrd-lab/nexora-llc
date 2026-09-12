export const metadata = {
  title: "Privacy Policy | Nexora",
  description: "Nexora privacy policy",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-16 text-foreground sm:px-10">
      <article className="prose prose-neutral max-w-none">
        <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: September 12, 2026</p>

        <p className="mt-10 leading-7">
          Nexora ("we", "us", "our", or "the Company") operates a high-frequency trading platform and cryptocurrency trading application (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. Please read this Privacy Policy carefully. By accessing or using our Service, you agree to be bound by the terms and conditions of this Privacy Policy. If you do not agree with our Privacy Policy, please do not access or use our Service.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">1. Information We Collect</h2>
        
        <h3 className="mt-6 text-xl font-semibold">1.1 Personal Information</h3>
        <p className="mt-4 leading-7">
          We collect information that you voluntarily provide to us when you register for an account, use our Service, or communicate with us. This includes:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li><strong>Account Information:</strong> When you sign in with Google OAuth, we collect your name and email address from your Google account. We do not request or receive access to your Gmail, Google Drive, Google Photos, or any other Google services beyond basic profile information required for authentication.</li>
          <li><strong>Phone Number:</strong> We collect your M-Pesa phone number (Safaricom) to facilitate mobile money deposits and withdrawals. This information is stored securely and used solely for payment processing purposes.</li>
          <li><strong>Cryptocurrency Wallet Addresses:</strong> When you initiate cryptocurrency deposits or withdrawals, we collect your wallet address on the BNB Chain (BSC) network to process these transactions.</li>
        </ul>

        <h3 className="mt-6 text-xl font-semibold">1.2 Financial Information</h3>
        <p className="mt-4 leading-7">
          We collect financial information necessary to provide our trading and payment services:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li><strong>Account Balances:</strong> We maintain records of your balances in Kenyan Shillings (KES), USDT, and NXR tokens within our platform.</li>
          <li><strong>Transaction History:</strong> We record all deposits, withdrawals, swaps, and trading transactions executed through our platform for accounting, regulatory compliance, and dispute resolution purposes.</li>
          <li><strong>Payment Information:</strong> When you make deposits via M-Pesa, we process payment information through our payment processor (ZetuPay) and maintain records of these transactions.</li>
        </ul>

        <h3 className="mt-6 text-xl font-semibold">1.3 Referral Information</h3>
        <p className="mt-4 leading-7">
          If you participate in our referral program, we collect:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li>Referral codes and relationships between referrers and referred users</li>
          <li>Referral status (pending, completed, etc.)</li>
          <li>Deposit amounts associated with referrals</li>
          <li>Phone numbers of referred users (with consent)</li>
        </ul>

        <h3 className="mt-6 text-xl font-semibold">1.4 Technical and Usage Information</h3>
        <p className="mt-4 leading-7">
          We automatically collect certain technical information when you use our Service:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers, and mobile network information</li>
          <li><strong>Usage Data:</strong> Pages viewed, features used, time spent on the Service, and interaction patterns</li>
          <li><strong>Log Data:</strong> Server logs, error reports, and performance metrics</li>
        </ul>

        <h2 className="mt-10 text-2xl font-semibold">2. How We Use Your Information</h2>
        <p className="mt-4 leading-7">
          We use the information we collect for the following purposes:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li><strong>Service Provision:</strong> To provide, maintain, and improve our trading platform, including processing deposits, withdrawals, swaps, and executing trading strategies.</li>
          <li><strong>Account Management:</strong> To create and manage your user account, authenticate your identity, and enable access to our Service.</li>
          <li><strong>Payment Processing:</strong> To process M-Pesa deposits and withdrawals, cryptocurrency transactions, and to maintain accurate financial records.</li>
          <li><strong>Communication:</strong> To send you important notices, security alerts, transaction confirmations, and support communications related to your account.</li>
          <li><strong>Referral Program:</strong> To track and manage referral relationships, verify referral eligibility, and process referral bonuses.</li>
          <li><strong>Security and Fraud Prevention:</strong> To detect, prevent, and address technical issues, fraud, security breaches, and illegal activities.</li>
          <li><strong>Compliance:</strong> To comply with applicable laws, regulations, and legal obligations, including anti-money laundering (AML) and know-your-customer (KYC) requirements.</li>
          <li><strong>Analytics and Improvement:</strong> To analyze usage patterns, improve our Service, develop new features, and enhance user experience.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-semibold">3. Information Sharing and Disclosure</h2>
        <p className="mt-4 leading-7">
          We do not sell, rent, or trade your personal information with third parties for their marketing purposes. We may share your information only in the following circumstances:
        </p>

        <h3 className="mt-6 text-xl font-semibold">3.1 Service Providers</h3>
        <p className="mt-4 leading-7">
          We may share your information with trusted third-party service providers who perform services on our behalf, including:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li><strong>Appwrite:</strong> Our backend infrastructure provider that hosts our database and authentication systems.</li>
          <li><strong>ZetuPay:</strong> Our payment processor for M-Pesa transactions.</li>
          <li><strong>Google:</strong> For OAuth authentication services (limited to profile information).</li>
          <li><strong>Cloud Infrastructure Providers:</strong> For hosting and deployment services.</li>
        </ul>
        <p className="mt-4 leading-7">
          These service providers have access to your information only to perform specific tasks on our behalf and are obligated not to disclose or use it for any other purpose.
        </p>

        <h3 className="mt-6 text-xl font-semibold">3.2 Legal Requirements</h3>
        <p className="mt-4 leading-7">
          We may disclose your information if required to do so by law or in response to valid legal requests, such as:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li>Compliance with court orders, subpoenas, or other legal processes</li>
          <li>Protection of our rights, property, or safety, or that of our users or the public</li>
          <li>Investigation of suspected fraud, security breaches, or illegal activities</li>
          <li>Enforcement of our Terms of Service and this Privacy Policy</li>
        </ul>

        <h3 className="mt-6 text-xl font-semibold">3.3 Business Transfers</h3>
        <p className="mt-4 leading-7">
          In the event of a merger, acquisition, sale of assets, or bankruptcy, your information may be transferred to the successor entity as part of the transaction. We will notify you of any such transfer via email or prominent notice on our Service.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">4. Data Security</h2>
        <p className="mt-4 leading-7">
          We implement industry-standard security measures to protect your information from unauthorized access, use, or disclosure. These measures include:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li><strong>Encryption:</strong> Data is encrypted in transit using TLS/SSL protocols and at rest using industry-standard encryption methods.</li>
          <li><strong>Access Controls:</strong> Strict access controls and authentication mechanisms limit access to your information to authorized personnel only.</li>
          <li><strong>Secure Infrastructure:</strong> Our infrastructure is hosted on secure cloud platforms with robust security controls and regular security audits.</li>
          <li><strong>Regular Monitoring:</strong> We monitor our systems for potential security vulnerabilities and respond promptly to any identified issues.</li>
        </ul>
        <p className="mt-4 leading-7">
          However, no method of transmission over the internet or electronic storage is completely secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">5. Data Retention</h2>
        <p className="mt-4 leading-7">
          We retain your information for as long as necessary to provide our Service, fulfill our legal obligations, resolve disputes, and enforce our agreements. The specific retention periods vary based on the type of information and applicable legal requirements:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li><strong>Account Information:</strong> Retained while your account is active and for a reasonable period after account closure for legal and business purposes.</li>
          <li><strong>Transaction Records:</strong> Retained for at least 7 years to comply with financial record-keeping requirements and tax regulations.</li>
          <li><strong>Payment Information:</strong> Retained as required by payment processors and financial regulations.</li>
          <li><strong>Referral Data:</strong> Retained for the duration of the referral program and for a reasonable period thereafter.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-semibold">6. Your Rights and Choices</h2>
        <p className="mt-4 leading-7">
          Depending on your jurisdiction, you may have certain rights regarding your personal information:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li><strong>Access:</strong> Request access to the personal information we hold about you.</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information.</li>
          <li><strong>Deletion:</strong> Request deletion of your personal information, subject to certain legal and business exceptions.</li>
          <li><strong>Portability:</strong> Request a copy of your information in a structured, machine-readable format.</li>
          <li><strong>Objection:</strong> Object to our processing of your information in certain circumstances.</li>
          <li><strong>Restriction:</strong> Request restriction of our processing of your information in certain circumstances.</li>
        </ul>
        <p className="mt-4 leading-7">
          To exercise these rights, please contact us at the email address provided below. We will respond to your request within a reasonable timeframe, typically within 30 days, in accordance with applicable laws.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">7. International Data Transfers</h2>
        <p className="mt-4 leading-7">
          Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws than your jurisdiction. When we transfer your information internationally, we ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable laws.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">8. Children's Privacy</h2>
        <p className="mt-4 leading-7">
          Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us, and we will take steps to delete such information.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">9. Changes to This Privacy Policy</h2>
        <p className="mt-4 leading-7">
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">10. Governing Law</h2>
        <p className="mt-4 leading-7">
          This Privacy Policy shall be governed by and construed in accordance with the laws of the Republic of Kenya, without regard to its conflict of law provisions. Your use of our Service and any dispute arising from your use of our Service shall be subject to the laws of Kenya.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">11. Contact Us</h2>
        <p className="mt-4 leading-7">
          If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
        </p>
        <ul className="mt-4 list-disc pl-6 leading-7">
          <li><strong>Email:</strong>{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="mailto:brianitira@gmail.com"
            >
              brianitira@gmail.com
            </a>
          </li>
          <li><strong>Website:</strong> https://nexoraquant.com</li>
        </ul>
        <p className="mt-4 leading-7">
          We will respond to your inquiries within a reasonable timeframe, typically within 5-10 business days.
        </p>
      </article>
    </main>
  );
}
