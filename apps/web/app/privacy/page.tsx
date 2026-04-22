export const metadata = {
  title: "Privacy Policy — KAP Edutech",
  description: "Privacy Policy for the KAP Edutech Parent Portal app.",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", color: "#111827", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: "#6B7280", marginBottom: 32 }}>Last updated: April 22, 2025</p>

      <p>
        KAP Edutech ("we", "our", or "us") operates the <strong>KAP Edutech Parent Portal</strong> mobile
        application (the "App"). This Privacy Policy explains how we collect, use, and protect your
        information when you use our App.
      </p>

      <Section title="1. Information We Collect">
        <p>We collect the following information when you use the App:</p>
        <ul>
          <li><strong>Phone number</strong> — used to verify your identity via OTP and link your account to your child's enrollment.</li>
          <li><strong>Device push token</strong> — used to send you attendance notifications.</li>
          <li><strong>Student information</strong> — name, enrollment number, batch, and attendance records associated with your child.</li>
        </ul>
        <p>We do <strong>not</strong> collect payment information, location data, or any other personal data.</p>
      </Section>

      <Section title="2. How We Use Your Information">
        <ul>
          <li>To authenticate you securely via OTP (one-time password) on login.</li>
          <li>To display your child's attendance records and schedule.</li>
          <li>To send push notifications when attendance is marked.</li>
          <li>To contact you regarding your account or your child's attendance.</li>
        </ul>
      </Section>

      <Section title="3. Data Sharing">
        <p>
          We do <strong>not</strong> sell, trade, or rent your personal information to any third party.
          Your data is only shared with:
        </p>
        <ul>
          <li><strong>Firebase (Google)</strong> — for phone number OTP verification.</li>
          <li><strong>Expo (Expo Inc.)</strong> — for delivering push notifications to your device.</li>
          <li><strong>Neon (database host)</strong> — for secure cloud storage of attendance records.</li>
        </ul>
        <p>All third-party services are bound by their own privacy policies and applicable data protection laws.</p>
      </Section>

      <Section title="4. Data Security">
        <p>
          We use industry-standard security measures including HTTPS encryption and secure database
          hosting. OTPs expire within 10 minutes and cannot be reused. JWT tokens are used for session
          authentication and expire after 30 days.
        </p>
      </Section>

      <Section title="5. Data Retention">
        <p>
          Your account data is retained as long as your child is enrolled at the institute. Attendance
          records are kept for academic record purposes. You may request deletion of your account at any
          time by contacting us.
        </p>
      </Section>

      <Section title="6. Children's Privacy">
        <p>
          The App is intended for use by parents and guardians (18 years and older). We do not knowingly
          collect personal data directly from children under 13. Student data (name, enrollment number,
          attendance) is managed by the institute and accessed only by the verified parent/guardian.
        </p>
      </Section>

      <Section title="7. Your Rights">
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your account and associated data.</li>
        </ul>
        <p>To exercise these rights, contact us at the email below.</p>
      </Section>

      <Section title="8. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant changes
          via the App or email. Continued use of the App after changes constitutes acceptance of the
          updated policy.
        </p>
      </Section>

      <Section title="9. Contact Us">
        <p>
          If you have any questions about this Privacy Policy or your data, please contact us at:
        </p>
        <p>
          <strong>KAP Edutech</strong><br />
          Email: <a href="mailto:adityasdhondge04@gmail.com" style={{ color: "#4F46E5" }}>adityasdhondge04@gmail.com</a>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#1F2937" }}>{title}</h2>
      {children}
    </section>
  );
}
