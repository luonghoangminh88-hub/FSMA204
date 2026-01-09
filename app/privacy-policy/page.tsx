import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Lock, Database, Eye, AlertTriangle, Globe } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-emerald rounded-xl flex items-center justify-center shadow-glow-emerald">
              <ShieldCheck className="size-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-black text-foreground">VEXIMGLOBAL</div>
              <div className="text-xs text-primary">FSMA 204 Compliance</div>
            </div>
          </Link>
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Title Section */}
          <div className="text-center space-y-4">
            <Badge className="gradient-emerald text-white border-0">Legal Document</Badge>
            <h1 className="text-4xl md:text-5xl font-black text-foreground">Privacy Policy</h1>
            <p className="text-muted-foreground text-lg">Last Updated: January 4, 2026</p>
          </div>

          {/* Introduction */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="size-6 text-primary" />
                <CardTitle>Our Commitment to Privacy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                VEXIMGLOBAL ("Company," "we," "us," or "our") is committed to protecting the privacy and security of
                your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard
                your information when you use our FSMA 204 Compliance Platform (the "Service").
              </p>
              <p>
                We understand that food supply chain traceability data is highly sensitive and business-critical. This
                policy describes our practices regarding personal data and business information in compliance with
                applicable data protection laws, including GDPR, CCPA, and Vietnamese data protection regulations.
              </p>
              <p>
                <strong>
                  By using our Service, you consent to the data practices described in this Privacy Policy.
                </strong>
                If you do not agree with our policies and practices, please do not use our Service.
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="size-6 text-primary" />
                <CardTitle>1. Information We Collect</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>1.1 Account Information</strong>
              </p>
              <p>When you register for an account, we collect:</p>
              <ul>
                <li>Full name and email address</li>
                <li>Phone number and business contact information</li>
                <li>Company name and organization details</li>
                <li>Job title and role within your organization</li>
                <li>Password (stored as encrypted hash, never in plain text)</li>
              </ul>

              <p>
                <strong>1.2 Business and Traceability Data</strong>
              </p>
              <p>When you use the Service, we collect:</p>
              <ul>
                <li>
                  <strong>Critical Tracking Events (CTE):</strong> Harvesting, cooling, packing, receiving, shipping,
                  and transformation events
                </li>
                <li>
                  <strong>Key Data Elements (KDE):</strong> Lot codes, product descriptions, quantities, dates, times,
                  and locations
                </li>
                <li>
                  <strong>Traceability Lot Codes (TLC):</strong> Unique identifiers assigned to food products
                </li>
                <li>
                  <strong>Supplier and Customer Information:</strong> Names, addresses, and contact details of supply
                  chain partners
                </li>
                <li>
                  <strong>Product Information:</strong> Food product names, descriptions, origins, and destinations
                </li>
                <li>
                  <strong>Location Data:</strong> Farm locations, facility addresses, and shipping/receiving locations
                </li>
                <li>
                  <strong>FDA Registration Information:</strong> FDA registration numbers and facility identifiers
                </li>
              </ul>

              <p>
                <strong>1.3 Usage and Technical Data</strong>
              </p>
              <p>We automatically collect:</p>
              <ul>
                <li>IP addresses, device identifiers, and browser types</li>
                <li>Operating system and device information</li>
                <li>Pages viewed, features used, and time spent on the Service</li>
                <li>Clickstream data and navigation patterns</li>
                <li>Error logs and diagnostic information</li>
                <li>API usage and integration activity</li>
              </ul>

              <p>
                <strong>1.4 Cookies and Tracking Technologies</strong>
              </p>
              <p>We use cookies and similar tracking technologies to:</p>
              <ul>
                <li>Maintain your login session and remember your preferences</li>
                <li>Analyze Service usage and improve functionality</li>
                <li>Detect and prevent fraud and security threats</li>
                <li>Provide personalized content and recommendations</li>
              </ul>
              <p>You can control cookie settings through your browser preferences.</p>

              <p>
                <strong>1.5 Communications</strong>
              </p>
              <p>We collect information from:</p>
              <ul>
                <li>Support tickets, chat messages, and email correspondence</li>
                <li>Feedback, surveys, and user research participation</li>
                <li>Phone calls with customer support (which may be recorded)</li>
              </ul>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>We use collected information for the following purposes:</p>

              <p>
                <strong>2.1 Service Provision and Operation</strong>
              </p>
              <ul>
                <li>Provide access to the FSMA 204 Compliance Platform</li>
                <li>Process and store traceability data for compliance purposes</li>
                <li>Generate FDA-compliant reports and documentation</li>
                <li>Enable forward and backward traceability chain analysis</li>
                <li>Facilitate data sharing with authorized supply chain partners</li>
              </ul>

              <p>
                <strong>2.2 Account Management</strong>
              </p>
              <ul>
                <li>Create and maintain your user account</li>
                <li>Authenticate your identity and manage access controls</li>
                <li>Process subscription payments and manage billing</li>
                <li>Send account-related notifications and updates</li>
              </ul>

              <p>
                <strong>2.3 Service Improvement and Development</strong>
              </p>
              <ul>
                <li>Analyze usage patterns to improve Service functionality</li>
                <li>Develop new features and capabilities</li>
                <li>Conduct research and analytics (using anonymized data)</li>
                <li>Test and optimize Service performance</li>
              </ul>

              <p>
                <strong>2.4 Security and Fraud Prevention</strong>
              </p>
              <ul>
                <li>Detect, prevent, and respond to security incidents</li>
                <li>Monitor for fraudulent or unauthorized activity</li>
                <li>Enforce our Terms of Service and usage policies</li>
                <li>Conduct security audits and vulnerability assessments</li>
              </ul>

              <p>
                <strong>2.5 Legal Compliance</strong>
              </p>
              <ul>
                <li>Comply with applicable laws and regulations</li>
                <li>Respond to legal requests and government inquiries</li>
                <li>Protect our legal rights and interests</li>
                <li>Maintain audit trails for compliance purposes</li>
              </ul>

              <p>
                <strong>2.6 Communication</strong>
              </p>
              <ul>
                <li>Provide customer support and respond to inquiries</li>
                <li>Send service announcements and updates</li>
                <li>Deliver regulatory alerts and compliance notifications</li>
                <li>Send marketing communications (with your consent, where required)</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Sharing */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Globe className="size-6 text-primary" />
                <CardTitle>3. How We Share Your Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                We do not sell your personal information or traceability data. We may share your information in the
                following circumstances:
              </p>

              <p>
                <strong>3.1 Supply Chain Partners (With Your Authorization)</strong>
              </p>
              <p>
                When you explicitly authorize data sharing with supply chain partners (e.g., suppliers, distributors,
                customers), we facilitate the secure exchange of relevant traceability information. You control which
                data is shared and with whom through our platform's sharing settings.
              </p>

              <p>
                <strong>3.2 Service Providers and Subprocessors</strong>
              </p>
              <p>
                We share information with trusted third-party service providers who assist us in operating the Service:
              </p>
              <ul>
                <li>
                  <strong>Cloud Infrastructure:</strong> AWS, Google Cloud, or similar providers for hosting and data
                  storage
                </li>
                <li>
                  <strong>Payment Processors:</strong> Stripe or similar services for subscription billing
                </li>
                <li>
                  <strong>Email Services:</strong> For transactional and support communications
                </li>
                <li>
                  <strong>Analytics Providers:</strong> For Service improvement (using anonymized data)
                </li>
                <li>
                  <strong>Security Services:</strong> For monitoring, threat detection, and incident response
                </li>
              </ul>
              <p>
                All service providers are contractually obligated to protect your information and use it only for
                specified purposes.
              </p>

              <p>
                <strong>3.3 Regulatory and Legal Requirements</strong>
              </p>
              <p>We may disclose information when required by law or in response to:</p>
              <ul>
                <li>FDA requests during food safety investigations or recall events</li>
                <li>Court orders, subpoenas, or legal processes</li>
                <li>Government agency requests or regulatory inquiries</li>
                <li>Law enforcement investigations</li>
              </ul>

              <p>
                <strong>3.4 Business Transfers</strong>
              </p>
              <p>
                In the event of a merger, acquisition, reorganization, or sale of assets, your information may be
                transferred to the successor entity. We will provide notice before your information is transferred and
                becomes subject to a different privacy policy.
              </p>

              <p>
                <strong>3.5 Aggregated and Anonymized Data</strong>
              </p>
              <p>
                We may share aggregated, anonymized, or de-identified data that cannot reasonably be used to identify
                you or your organization. This data may be used for industry research, benchmarking, and Service
                improvement.
              </p>

              <p>
                <strong>3.6 With Your Consent</strong>
              </p>
              <p>
                We may share your information for purposes not described in this Privacy Policy when we obtain your
                explicit consent.
              </p>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-6 text-primary" />
                <CardTitle>4. Data Security Measures</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>We implement comprehensive security measures to protect your information:</p>

              <p>
                <strong>4.1 Encryption</strong>
              </p>
              <ul>
                <li>
                  <strong>Data at Rest:</strong> AES-256 encryption for all stored data
                </li>
                <li>
                  <strong>Data in Transit:</strong> TLS 1.3 encryption for all data transmission
                </li>
                <li>
                  <strong>Database Encryption:</strong> Field-level encryption for sensitive data
                </li>
                <li>
                  <strong>Backup Encryption:</strong> Encrypted backups with separate key management
                </li>
              </ul>

              <p>
                <strong>4.2 Access Controls</strong>
              </p>
              <ul>
                <li>Multi-factor authentication (MFA) for all user accounts</li>
                <li>Role-based access control (RBAC) with principle of least privilege</li>
                <li>Row-level security (RLS) ensuring organization data isolation</li>
                <li>Session management with automatic timeout and refresh tokens</li>
              </ul>

              <p>
                <strong>4.3 Network Security</strong>
              </p>
              <ul>
                <li>Web Application Firewall (WAF) protection</li>
                <li>DDoS mitigation and rate limiting</li>
                <li>Intrusion detection and prevention systems</li>
                <li>Regular vulnerability scanning and penetration testing</li>
              </ul>

              <p>
                <strong>4.4 Application Security</strong>
              </p>
              <ul>
                <li>Input validation and sanitization to prevent injection attacks</li>
                <li>Parameterized database queries to prevent SQL injection</li>
                <li>Content Security Policy (CSP) headers to prevent XSS attacks</li>
                <li>Secure session management and CSRF protection</li>
              </ul>

              <p>
                <strong>4.5 Operational Security</strong>
              </p>
              <ul>
                <li>24/7 security monitoring and incident response</li>
                <li>Comprehensive audit logging of all access and changes</li>
                <li>Regular security training for all personnel</li>
                <li>Incident response plan and breach notification procedures</li>
              </ul>

              <p>
                <strong>4.6 Compliance Certifications</strong>
              </p>
              <ul>
                <li>SOC 2 Type II certified annual audits</li>
                <li>ISO 27001 information security management compliance</li>
                <li>FDA 21 CFR Part 11 electronic records compliance</li>
                <li>GDPR and CCPA data protection compliance</li>
              </ul>

              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> While we implement robust security measures, no system is completely secure. We
                cannot guarantee absolute security of your information.
              </p>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle>5. Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>5.1 Retention Periods</strong>
              </p>
              <p>
                We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy
                Policy:
              </p>
              <ul>
                <li>
                  <strong>Account Information:</strong> Retained while your account is active and for 90 days after
                  closure
                </li>
                <li>
                  <strong>Traceability Records:</strong> Retained for minimum of 2 years as required by FDA FSMA 204
                  regulations
                </li>
                <li>
                  <strong>Audit Logs:</strong> Retained for 7 years for compliance and legal purposes
                </li>
                <li>
                  <strong>Financial Records:</strong> Retained for 7 years for tax and accounting purposes
                </li>
                <li>
                  <strong>Support Communications:</strong> Retained for 3 years for quality assurance and training
                </li>
              </ul>

              <p>
                <strong>5.2 Extended Retention</strong>
              </p>
              <p>We may retain information longer when:</p>
              <ul>
                <li>Required by law or regulation (e.g., FDA recordkeeping requirements)</li>
                <li>Necessary for legal proceedings or investigations</li>
                <li>Needed to protect our legal rights or interests</li>
                <li>You request extended retention for business continuity</li>
              </ul>

              <p>
                <strong>5.3 Data Deletion</strong>
              </p>
              <p>
                Upon account termination, you have 30 days to export your data. After this period, we securely delete
                your data unless retention is required by law. Deletion includes secure overwriting of storage media to
                prevent data recovery.
              </p>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Eye className="size-6 text-primary" />
                <CardTitle>6. Your Privacy Rights</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>Depending on your location, you may have the following rights:</p>

              <p>
                <strong>6.1 Access and Portability</strong>
              </p>
              <ul>
                <li>
                  <strong>Right to Access:</strong> Request a copy of personal information we hold about you
                </li>
                <li>
                  <strong>Data Portability:</strong> Receive your data in a structured, machine-readable format
                </li>
                <li>
                  <strong>Export Functionality:</strong> Export your traceability data at any time through the Service
                </li>
              </ul>

              <p>
                <strong>6.2 Correction and Update</strong>
              </p>
              <ul>
                <li>Correct inaccurate or incomplete personal information</li>
                <li>Update your account details and preferences</li>
                <li>Modify traceability records (with audit trail maintained)</li>
              </ul>

              <p>
                <strong>6.3 Deletion and Erasure</strong>
              </p>
              <ul>
                <li>Request deletion of your personal information ("right to be forgotten")</li>
                <li>Close your account and request data deletion</li>
                <li>Note: Some data may be retained as required by law or for legitimate business purposes</li>
              </ul>

              <p>
                <strong>6.4 Restriction and Objection</strong>
              </p>
              <ul>
                <li>Restrict processing of your personal information</li>
                <li>Object to processing based on legitimate interests</li>
                <li>Opt-out of marketing communications</li>
              </ul>

              <p>
                <strong>6.5 Withdraw Consent</strong>
              </p>
              <ul>
                <li>Withdraw consent for processing where consent was the legal basis</li>
                <li>Note: Withdrawal does not affect lawfulness of processing before withdrawal</li>
              </ul>

              <p>
                <strong>6.6 Lodge a Complaint</strong>
              </p>
              <ul>
                <li>File a complaint with your local data protection authority</li>
                <li>Contact us directly to resolve concerns</li>
              </ul>

              <p>
                <strong>Exercising Your Rights:</strong>
              </p>
              <p>
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:privacy@veximglobal.com" className="text-primary hover:underline">
                  privacy@veximglobal.com
                </a>
                . We will respond to verified requests within 30 days.
              </p>
            </CardContent>
          </Card>

          {/* International Transfers */}
          <Card>
            <CardHeader>
              <CardTitle>7. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                Your information may be transferred to and processed in countries other than your country of residence,
                including Vietnam and the United States.
              </p>

              <p>
                <strong>7.1 Safeguards for International Transfers</strong>
              </p>
              <p>When we transfer data internationally, we ensure appropriate safeguards:</p>
              <ul>
                <li>Standard Contractual Clauses (SCCs) approved by relevant data protection authorities</li>
                <li>Adequacy decisions recognizing equivalent data protection standards</li>
                <li>Binding Corporate Rules for intra-organization transfers</li>
                <li>Your explicit consent for transfers where required</li>
              </ul>

              <p>
                <strong>7.2 Data Localization Options</strong>
              </p>
              <p>
                Enterprise customers may request data localization in specific regions. Contact our sales team for
                regional hosting options.
              </p>
            </CardContent>
          </Card>

          {/* Children's Privacy */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-6 text-amber-500" />
                <CardTitle>8. Children's Privacy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                Our Service is intended for business use by adults. We do not knowingly collect personal information
                from children under 18. If we become aware that we have collected personal information from a child
                under 18, we will take steps to delete such information promptly.
              </p>
              <p>
                If you believe we have collected information from a child under 18, please contact us immediately at{" "}
                <a href="mailto:privacy@veximglobal.com" className="text-primary hover:underline">
                  privacy@veximglobal.com
                </a>
                .
              </p>
            </CardContent>
          </Card>

          {/* Changes to Policy */}
          <Card>
            <CardHeader>
              <CardTitle>9. Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology,
                legal requirements, or other factors.
              </p>
              <p>
                <strong>Notification of Changes:</strong>
              </p>
              <ul>
                <li>Material changes will be notified via email at least 30 days before taking effect</li>
                <li>We will post a notice in the Service and update the "Last Updated" date</li>
                <li>Continued use of the Service after changes become effective constitutes acceptance</li>
                <li>We maintain an archive of previous versions for your reference</li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Questions or concerns about privacy? Contact us:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Data Protection Officer</strong>
                  <br />
                  VEXIMGLOBAL
                  <br />
                  Address: Số 25/6/51 Ngoa Long, Tay Tuu, Ha Noi, Vietnam
                </p>
                <p className="text-sm">
                  <strong>Email:</strong>{" "}
                  <a href="mailto:privacy@veximglobal.com" className="text-primary hover:underline">
                    privacy@veximglobal.com
                  </a>
                  <br />
                  <strong>Phone:</strong>{" "}
                  <a href="tel:0344591641" className="text-primary hover:underline">
                    0344 591 641
                  </a>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Response time: We aim to respond to all privacy inquiries within 48 business hours.
              </p>
            </CardContent>
          </Card>

          {/* Acknowledgment */}
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>
                  By using the VEXIMGLOBAL FSMA 204 Compliance Platform, you acknowledge that you have read and
                  understood this Privacy Policy and agree to the collection, use, and disclosure of your information as
                  described herein.
                </strong>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-16 py-8">
        <div className="container mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/terms-of-service" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2026 VEXIMGLOBAL. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
