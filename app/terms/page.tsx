"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center h-14 md:h-16 px-1 md:px-2">
            <img
              src="/bplogo.png"
              alt="Logo"
              className="max-h-9 md:max-h-12 object-contain"
              style={{ width: 'auto', height: '100%' }}
            />
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 md:gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-2xl md:text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">Last updated: February 5, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 md:space-y-8">
          <section>
            <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">1. Acceptance of Terms</h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              By accessing or using myBlueprint ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you disagree with any part of the terms, you may not access the Service. These Terms apply to all visitors, 
              users, and others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              myBlueprint is a project management and content planning platform designed for YouTube creators and content studios. 
              The Service provides tools for video project management, script writing, thumbnail management, team collaboration, 
              and content workflow organization.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you create an account with us, you must provide accurate, complete, and current information. 
              Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You are responsible for safeguarding the password that you use to access the Service and for any activities 
              or actions under your password. You agree not to disclose your password to any third party.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Content and Responsibility</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our Service allows you to post, link, store, share and otherwise make available certain information, text, 
              graphics, or other material ("Content"). You are solely responsible for the Content that you post, upload, 
              or otherwise make available via the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">You represent and warrant that:</strong>
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>You own the Content or have the right to use it and grant us the rights and license as provided in these Terms</li>
              <li>The posting of your Content does not violate the privacy rights, publicity rights, copyrights, contract rights, or any other rights of any person</li>
              <li>Your Content does not contain any viruses, malware, or other harmful code</li>
              <li>Your Content is not spam, machine-generated, or randomly generated</li>
              <li>Your Content does not promote illegal activities or violate any applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Service and its original content (excluding Content provided by users), features, and functionality are 
              and will remain the exclusive property of myBlueprint and its licensors. The Service is protected by copyright, 
              trademark, and other laws.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You retain all rights to the Content you upload to the Service. By uploading Content, you grant us a 
              non-exclusive, worldwide, royalty-free license to use, store, and display your Content solely for the 
              purpose of providing the Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Subscriptions and Payments</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Some parts of the Service are billed on a subscription basis ("Subscription"). You will be billed in advance 
              on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set either on a monthly or annual basis.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              At the end of each Billing Cycle, your Subscription will automatically renew under the exact same conditions 
              unless you cancel it or we cancel it. You may cancel your Subscription renewal through your account settings 
              or by contacting our support team.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              A valid payment method is required to process the payment for your Subscription. You shall provide accurate 
              and complete billing information. By submitting such payment information, you automatically authorize us to 
              charge all Subscription fees incurred through your account to any such payment instruments.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              Except when required by law, paid Subscription fees are non-refundable. Certain refund requests for 
              Subscriptions may be considered on a case-by-case basis and granted at the sole discretion of myBlueprint.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Free Trial</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may offer a free trial Subscription for a limited period of time. You may be required to enter your 
              billing information to sign up for the Free Trial. If you do enter your billing information, you will not 
              be charged until the Free Trial has expired. On the last day of the Free Trial period, unless you cancelled 
              your Subscription, you will be automatically charged the applicable fee for the type of Subscription you selected.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Prohibited Uses</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may use the Service only for lawful purposes and in accordance with the Terms. You agree not to use the Service:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>In any way that violates any applicable national or international law or regulation</li>
              <li>To transmit any advertising or promotional material, including any "junk mail," "chain letter," "spam," or any similar solicitation</li>
              <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity</li>
              <li>To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service</li>
              <li>To attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of the Service</li>
              <li>To use any robot, spider, or other automatic device to access the Service for any purpose</li>
              <li>To introduce any viruses, trojan horses, worms, or other material which is malicious or technologically harmful</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. YouTube Integration</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our Service may integrate with YouTube and YouTube API Services. By using these integrations, you also agree 
              to be bound by the YouTube Terms of Service (https://www.youtube.com/t/terms) and Google Privacy Policy 
              (https://policies.google.com/privacy).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We are not affiliated with, endorsed by, or sponsored by YouTube or Google. All YouTube-related trademarks 
              are the property of Google LLC.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS 
              FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              myBlueprint does not warrant that (a) the Service will function uninterrupted, secure, or available at any 
              particular time or location; (b) any errors or defects will be corrected; (c) the Service is free of viruses 
              or other harmful components; or (d) the results of using the Service will meet your requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              IN NO EVENT SHALL MYBLUEPRINT, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES, 
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT 
              LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Your access to or use of or inability to access or use the Service</li>
              <li>Any conduct or content of any third party on the Service</li>
              <li>Any content obtained from the Service</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Our total liability to you for any damages shall not exceed the amount you have paid us in the twelve (12) 
              months prior to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to defend, indemnify, and hold harmless myBlueprint and its licensees, employees, contractors, 
              agents, officers, and directors from and against any and all claims, damages, obligations, losses, liabilities, 
              costs or debt, and expenses arising from: (a) your use of and access to the Service; (b) your violation of 
              any term of these Terms; (c) your violation of any third party right, including without limitation any 
              copyright, property, or privacy right; or (d) any claim that your Content caused damage to a third party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Termination</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason 
              whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use 
              the Service will immediately cease.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you wish to terminate your account, you may simply discontinue using the Service or contact us to 
              request account deletion. All provisions of the Terms which by their nature should survive termination 
              shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Data Backup</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we implement reasonable measures to protect your data, you are solely responsible for maintaining 
              backups of your Content. We shall not be liable for any loss, corruption, or unauthorized access to your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision 
              is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What 
              constitutes a material change will be determined at our sole discretion. By continuing to access or use 
              our Service after those revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which 
              myBlueprint operates, without regard to its conflict of law provisions. Our failure to enforce any right 
              or provision of these Terms will not be considered a waiver of those rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions 
              of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our 
              Service and supersede and replace any prior agreements we might have had.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">19. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us through our Help Center or support channels.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2026 myBlueprint</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
