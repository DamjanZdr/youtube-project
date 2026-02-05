"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center h-16 px-2">
            <img
              src="/bplogo.png"
              alt="Logo"
              className="max-h-12 object-contain"
              style={{ width: 'auto', height: '100%' }}
            />
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 5, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              myBlueprint ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our Service. Please read this 
              privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3 mt-6">2.1 Personal Information You Provide</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect information you voluntarily provide when you:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong className="text-foreground">Register for an account:</strong> Name, email address, password</li>
              <li><strong className="text-foreground">Set up your profile:</strong> Profile picture, display name, preferences</li>
              <li><strong className="text-foreground">Subscribe to paid plans:</strong> Billing information, payment method details (processed by Stripe)</li>
              <li><strong className="text-foreground">Create studios and projects:</strong> Studio names, project titles, scripts, descriptions, tags</li>
              <li><strong className="text-foreground">Upload content:</strong> Thumbnails, images, and other media files</li>
              <li><strong className="text-foreground">Contact support:</strong> Support tickets, help center posts, communications</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Information Collected Automatically</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you access our Service, we may automatically collect:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong className="text-foreground">Device Information:</strong> Browser type, operating system (anonymized, via Vercel Analytics)</li>
              <li><strong className="text-foreground">Usage Data:</strong> Page views, performance metrics (anonymized, aggregated)</li>
              <li><strong className="text-foreground">Authentication Cookies:</strong> Session cookies required for login and security</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We use Vercel Analytics, which is privacy-friendly and does not track individual users, use cookies for analytics, or collect personal data.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">2.3 Third-Party Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you connect your YouTube account, we may receive information from YouTube API Services, including 
              channel information, video metadata, and playlist data. This is governed by YouTube's Terms of Service 
              and Google's Privacy Policy. You can revoke access at any time through your Google Account settings at 
              https://security.google.com/settings/security/permissions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide, maintain, and improve our Service</li>
              <li>Create and manage your account</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative information, such as updates, security alerts, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Detect, prevent, and address technical issues and fraudulent activity</li>
              <li>Personalize your experience and deliver content relevant to your interests</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may share your information in the following circumstances:
            </p>
            
            <h3 className="text-xl font-medium mb-3 mt-6">4.1 With Your Consent</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may share your information when you give us explicit consent to do so.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">4.2 With Studio Team Members</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you join a studio, other members of that studio may see your name, profile picture, and contributions 
              to shared projects. Studio owners can see member activity within their studio.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">4.3 With Service Providers</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We share information with third-party service providers who perform services on our behalf:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong className="text-foreground">Supabase:</strong> Database hosting and authentication</li>
              <li><strong className="text-foreground">Stripe:</strong> Payment processing</li>
              <li><strong className="text-foreground">Vercel:</strong> Application hosting</li>
              <li><strong className="text-foreground">YouTube API Services:</strong> Channel integration features</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">4.4 For Legal Purposes</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may disclose your information if required by law, regulation, legal process, or governmental request, 
              or when we believe disclosure is necessary to protect our rights, protect your safety or the safety of 
              others, investigate fraud, or respond to a government request.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">4.5 Business Transfers</h3>
            <p className="text-muted-foreground leading-relaxed">
              If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as 
              part of that transaction. We will notify you via email and/or a prominent notice on our Service of any 
              change in ownership.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We retain your information for as long as your account is active or as needed to provide you the Service. 
              We will retain and use your information as necessary to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Comply with our legal obligations</li>
              <li>Resolve disputes</li>
              <li>Enforce our agreements</li>
              <li>Maintain backups for disaster recovery</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              When you delete your account, we will delete your personal information within 30 days, except for 
              information we are required to retain for legal or legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement appropriate technical and organizational security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Encryption of data in transit (TLS/SSL)</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure password hashing</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive 
              to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal information:
            </p>
            
            <h3 className="text-xl font-medium mb-3 mt-6">7.1 Access and Portability</h3>
            <p className="text-muted-foreground leading-relaxed">
              You can request a copy of the personal information we hold about you. We will provide this in a commonly 
              used, machine-readable format.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">7.2 Correction</h3>
            <p className="text-muted-foreground leading-relaxed">
              You can update or correct your account information at any time through your account settings.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">7.3 Deletion</h3>
            <p className="text-muted-foreground leading-relaxed">
              You can request deletion of your account and personal information. Some information may be retained as 
              required by law or for legitimate business purposes.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">7.4 Opt-Out</h3>
            <p className="text-muted-foreground leading-relaxed">
              You can opt out of receiving promotional communications by following the unsubscribe instructions in 
              those messages. You may still receive transactional or account-related emails.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">7.5 Revoke YouTube Access</h3>
            <p className="text-muted-foreground leading-relaxed">
              You can revoke our access to your YouTube data at any time by visiting Google's security settings at 
              https://security.google.com/settings/security/permissions and removing myBlueprint's access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use minimal cookies and privacy-friendly analytics:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong className="text-foreground">Essential Cookies:</strong> Required for the Service to function (authentication, security). These are strictly necessary and do not require consent.</li>
              <li><strong className="text-foreground">Analytics:</strong> We use Vercel Analytics, a privacy-friendly analytics service that does not use cookies, does not track personal data, and does not require consent under GDPR/CCPA. It only collects anonymous, aggregated data about page views and performance.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do <strong className="text-foreground">not</strong> use third-party tracking cookies, advertising cookies, or cross-site tracking. 
              You can control essential cookies through your browser settings, but note that disabling them may prevent you from logging in.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. These countries 
              may have different data protection laws. By using our Service, you consent to the transfer of your 
              information to these countries. We take steps to ensure that your information receives an adequate 
              level of protection in the jurisdictions in which we process it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not directed to individuals under the age of 13. We do not knowingly collect personal 
              information from children under 13. If you become aware that a child has provided us with personal 
              information, please contact us. If we become aware that we have collected personal information from 
              a child under 13 without verification of parental consent, we will take steps to remove that information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Third-Party Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service may contain links to third-party websites or services. We are not responsible for the 
              privacy practices of these third parties. We encourage you to read the privacy policies of any 
              third-party sites you visit.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. California Privacy Rights (CCPA)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Right to know what personal information we collect, use, disclose, and sell</li>
              <li>Right to request deletion of your personal information</li>
              <li>Right to opt-out of the sale of your personal information (we do not sell personal information)</li>
              <li>Right to non-discrimination for exercising your privacy rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. European Privacy Rights (GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Rights related to automated decision-making</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Our legal basis for processing your information includes: contract performance, legitimate interests, 
              legal obligations, and your consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the 
              new Privacy Policy on this page and updating the "Last updated" date. For significant changes, we will 
              provide a more prominent notice (including, for certain services, email notification of privacy policy changes).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us through:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Our Help Center support ticket system</li>
              <li>The contact information provided in the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. YouTube API Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our Service uses YouTube API Services. By using features that connect to YouTube, you agree to be bound by:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>YouTube Terms of Service: https://www.youtube.com/t/terms</li>
              <li>Google Privacy Policy: https://policies.google.com/privacy</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We access YouTube data only to provide the features you request (such as displaying channel information 
              and managing content). We do not store YouTube data longer than necessary to provide our Service.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2026 myBlueprint</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="text-foreground">Privacy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
