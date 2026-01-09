import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Scale, FileText, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function TermsOfServicePage() {
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
            <h1 className="text-4xl md:text-5xl font-black text-foreground">Terms of Service</h1>
            <p className="text-muted-foreground text-lg">Last Updated: January 4, 2026</p>
          </div>

          {/* Introduction */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="size-6 text-primary" />
                <CardTitle>Agreement to Terms</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or
                "your") and VEXIMGLOBAL ("Company," "we," "us," or "our") governing your access to and use of the FSMA
                204 Compliance Platform (the "Service").
              </p>
              <p>
                By accessing or using our Service, you acknowledge that you have read, understood, and agree to be bound
                by these Terms. If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </CardContent>
          </Card>

          {/* Service Description */}
          <Card>
            <CardHeader>
              <CardTitle>1. Service Description</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                VEXIMGLOBAL provides a comprehensive Food Safety Modernization Act (FSMA) Section 204 compliance
                platform designed to help food supply chain businesses meet FDA traceability requirements.
              </p>
              <p>
                <strong>Our Service includes:</strong>
              </p>
              <ul>
                <li>Critical Tracking Events (CTE) management and documentation</li>
                <li>Key Data Elements (KDE) recording and maintenance</li>
                <li>Traceability Lot Code (TLC) generation and tracking</li>
                <li>FDA-compliant record keeping and reporting</li>
                <li>Forward and backward traceability chain management</li>
                <li>Automated compliance validation and alerts</li>
                <li>Integration with existing ERP and supply chain systems</li>
              </ul>
            </CardContent>
          </Card>

          {/* User Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle>2. User Responsibilities and Account Security</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>2.1 Account Registration</strong>
              </p>
              <p>
                You must provide accurate, current, and complete information during registration. You are responsible
                for maintaining the confidentiality of your account credentials and for all activities that occur under
                your account.
              </p>

              <p>
                <strong>2.2 Data Accuracy</strong>
              </p>
              <p>
                You are solely responsible for the accuracy, quality, integrity, and legality of all data you input into
                the Service. You represent and warrant that you have all necessary rights and permissions to submit such
                data.
              </p>

              <p>
                <strong>2.3 Compliance Obligations</strong>
              </p>
              <p>
                While our Service assists with FSMA 204 compliance, <strong>you remain ultimately responsible</strong>{" "}
                for ensuring your business operations comply with all applicable FDA regulations, food safety laws, and
                traceability requirements. Our Service is a tool to facilitate compliance, not a guarantee of regulatory
                adherence.
              </p>

              <p>
                <strong>2.4 Prohibited Uses</strong>
              </p>
              <p>You agree not to:</p>
              <ul>
                <li>Submit false, misleading, or fraudulent traceability information</li>
                <li>Attempt to reverse engineer, decompile, or extract source code from the Service</li>
                <li>Use the Service for any unlawful purpose or to violate any regulations</li>
                <li>Interfere with or disrupt the integrity or performance of the Service</li>
                <li>Attempt to gain unauthorized access to any portion of the Service</li>
                <li>Resell, sublicense, or transfer your access to the Service without written consent</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Ownership and License */}
          <Card>
            <CardHeader>
              <CardTitle>3. Data Ownership and Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>3.1 Your Data</strong>
              </p>
              <p>
                You retain all ownership rights to the data you input into the Service ("Customer Data"). We do not
                claim ownership of your traceability records, lot information, or business data.
              </p>

              <p>
                <strong>3.2 License to Use Service</strong>
              </p>
              <p>
                Subject to these Terms and your payment of applicable fees, we grant you a limited, non-exclusive,
                non-transferable, revocable license to access and use the Service solely for your internal business
                purposes.
              </p>

              <p>
                <strong>3.3 Our Intellectual Property</strong>
              </p>
              <p>
                The Service, including all software, algorithms, user interfaces, designs, and underlying technology, is
                and remains the exclusive property of VEXIMGLOBAL. You acknowledge that the Service contains proprietary
                information protected by intellectual property laws.
              </p>
            </CardContent>
          </Card>

          {/* Service Level and Availability */}
          <Card>
            <CardHeader>
              <CardTitle>4. Service Level and Availability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>4.1 Uptime Commitment</strong>
              </p>
              <p>
                We strive to maintain 99.9% uptime for the Service, excluding scheduled maintenance. However, we do not
                guarantee uninterrupted access and are not liable for temporary unavailability due to maintenance,
                upgrades, or circumstances beyond our reasonable control.
              </p>

              <p>
                <strong>4.2 Scheduled Maintenance</strong>
              </p>
              <p>
                We may perform scheduled maintenance with advance notice. Emergency maintenance may be performed without
                prior notice when necessary to maintain security or functionality.
              </p>

              <p>
                <strong>4.3 Support Services</strong>
              </p>
              <p>
                Technical support is provided based on your subscription tier. Enterprise customers receive priority
                support with guaranteed response times as specified in their service agreement.
              </p>
            </CardContent>
          </Card>

          {/* Payment Terms */}
          <Card>
            <CardHeader>
              <CardTitle>5. Payment Terms and Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>5.1 Subscription Fees</strong>
              </p>
              <p>
                Access to the Service requires payment of subscription fees as specified in your selected pricing plan.
                All fees are exclusive of applicable taxes, which you are responsible for paying.
              </p>

              <p>
                <strong>5.2 Billing and Renewal</strong>
              </p>
              <p>
                Subscriptions automatically renew at the end of each billing period unless cancelled. You authorize us
                to charge your payment method for renewal fees. Price changes will be communicated 30 days in advance.
              </p>

              <p>
                <strong>5.3 Cancellation and Refunds</strong>
              </p>
              <p>
                You may cancel your subscription at any time. Cancellation takes effect at the end of the current
                billing period. We do not provide prorated refunds for partial subscription periods except as required
                by law or specified in your enterprise agreement.
              </p>

              <p>
                <strong>5.4 Free Trial</strong>
              </p>
              <p>
                If you register for a free trial, you may use the Service free of charge for the trial period. After the
                trial expires, continued access requires a paid subscription.
              </p>
            </CardContent>
          </Card>

          {/* Confidentiality */}
          <Card>
            <CardHeader>
              <CardTitle>6. Confidentiality and Data Protection</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>6.1 Confidential Information</strong>
              </p>
              <p>
                Each party agrees to protect the other's confidential information with the same degree of care used to
                protect its own confidential information, but no less than reasonable care.
              </p>

              <p>
                <strong>6.2 Data Security</strong>
              </p>
              <p>We implement industry-standard security measures to protect your data, including:</p>
              <ul>
                <li>AES-256 encryption for data at rest and in transit</li>
                <li>Multi-factor authentication and role-based access controls</li>
                <li>Regular security audits and penetration testing</li>
                <li>SOC 2 Type II compliance and annual third-party security assessments</li>
                <li>Automated backup and disaster recovery procedures</li>
              </ul>

              <p>
                <strong>6.3 Data Processing</strong>
              </p>
              <p>
                We process your data in accordance with our Privacy Policy and applicable data protection laws,
                including GDPR and CCPA where applicable. For details on data processing, please refer to our Privacy
                Policy.
              </p>
            </CardContent>
          </Card>

          {/* Regulatory Compliance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="size-6 text-amber-500" />
                <CardTitle>7. Regulatory Compliance and Disclaimers</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>7.1 FDA Compliance Tool</strong>
              </p>
              <p>
                The Service is designed to assist with FDA FSMA 204 compliance requirements. However,{" "}
                <strong>we do not guarantee that use of the Service will result in compliance</strong> with all
                applicable regulations. You are responsible for ensuring your operations meet all regulatory
                requirements.
              </p>

              <p>
                <strong>7.2 Not Legal or Regulatory Advice</strong>
              </p>
              <p>
                The Service does not constitute legal, regulatory, or compliance advice. You should consult with
                qualified legal and regulatory professionals to ensure your operations comply with all applicable laws.
              </p>

              <p>
                <strong>7.3 Accuracy of Information</strong>
              </p>
              <p>
                While we strive to provide accurate and up-to-date information regarding FDA requirements, regulations
                are subject to change. We are not responsible for any reliance you place on information provided through
                the Service.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardHeader>
              <CardTitle>8. Limitation of Liability and Warranties</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>8.1 Disclaimer of Warranties</strong>
              </p>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
                IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                PURPOSE, AND NON-INFRINGEMENT.
              </p>

              <p>
                <strong>8.2 Limitation of Liability</strong>
              </p>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL VEXIMGLOBAL BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
                DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
              </p>

              <p>
                <strong>8.3 Maximum Liability</strong>
              </p>
              <p>
                Our total liability to you for all claims arising out of or related to these Terms or the Service shall
                not exceed the amount you paid us in the twelve (12) months preceding the claim.
              </p>

              <p>
                <strong>8.4 FDA Enforcement Actions</strong>
              </p>
              <p>
                We are not liable for any FDA enforcement actions, penalties, fines, recalls, or other regulatory
                consequences you may face. Your use of the Service does not transfer compliance responsibility to us.
              </p>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>9. Termination and Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>9.1 Termination by You</strong>
              </p>
              <p>
                You may terminate your account at any time by following the cancellation process in your account
                settings or by contacting our support team.
              </p>

              <p>
                <strong>9.2 Termination by Us</strong>
              </p>
              <p>
                We may suspend or terminate your access to the Service immediately if you breach these Terms, engage in
                fraudulent activity, or fail to pay applicable fees.
              </p>

              <p>
                <strong>9.3 Data Export and Retention</strong>
              </p>
              <p>
                Upon termination, you have 30 days to export your data from the Service. After this period, we may
                delete your Customer Data unless legally required to retain it. We maintain anonymized aggregate data
                for analytical and compliance purposes.
              </p>

              <p>
                <strong>9.4 Survival</strong>
              </p>
              <p>
                Sections relating to intellectual property, confidentiality, limitation of liability, and dispute
                resolution survive termination of these Terms.
              </p>
            </CardContent>
          </Card>

          {/* Dispute Resolution */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Scale className="size-6 text-primary" />
                <CardTitle>10. Dispute Resolution and Governing Law</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>10.1 Governing Law</strong>
              </p>
              <p>
                These Terms are governed by and construed in accordance with the laws of Vietnam, without regard to
                conflict of law principles.
              </p>

              <p>
                <strong>10.2 Dispute Resolution Process</strong>
              </p>
              <p>
                In the event of any dispute, claim, or controversy arising out of or relating to these Terms or the
                Service, the parties agree to first attempt to resolve the matter through good faith negotiations for a
                period of thirty (30) days.
              </p>

              <p>
                <strong>10.3 Arbitration</strong>
              </p>
              <p>
                If negotiations fail, disputes shall be resolved through binding arbitration in Hanoi, Vietnam,
                conducted in English or Vietnamese as mutually agreed, under the rules of the Vietnam International
                Arbitration Centre (VIAC).
              </p>

              <p>
                <strong>10.4 Jurisdiction</strong>
              </p>
              <p>
                You agree to submit to the personal jurisdiction of the courts located in Hanoi, Vietnam for any actions
                not subject to arbitration.
              </p>
            </CardContent>
          </Card>

          {/* General Provisions */}
          <Card>
            <CardHeader>
              <CardTitle>11. General Provisions</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-4">
              <p>
                <strong>11.1 Amendments</strong>
              </p>
              <p>
                We reserve the right to modify these Terms at any time. We will provide notice of material changes via
                email or through the Service at least 30 days before the changes take effect. Your continued use of the
                Service after changes become effective constitutes acceptance of the modified Terms.
              </p>

              <p>
                <strong>11.2 Assignment</strong>
              </p>
              <p>
                You may not assign or transfer these Terms or your account without our prior written consent. We may
                assign these Terms in connection with a merger, acquisition, or sale of all or substantially all of our
                assets.
              </p>

              <p>
                <strong>11.3 Entire Agreement</strong>
              </p>
              <p>
                These Terms, together with our Privacy Policy and any applicable service agreements, constitute the
                entire agreement between you and VEXIMGLOBAL regarding the Service and supersede all prior agreements
                and understandings.
              </p>

              <p>
                <strong>11.4 Severability</strong>
              </p>
              <p>
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall
                continue in full force and effect.
              </p>

              <p>
                <strong>11.5 Waiver</strong>
              </p>
              <p>
                No waiver of any term of these Terms shall be deemed a further or continuing waiver of such term or any
                other term.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Questions about these Terms? Contact us:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <strong>VEXIMGLOBAL</strong>
                <br />
                Address: Số 25/6/51 Ngoa Long, Tay Tuu, Ha Noi, Vietnam
                <br />
                Email:{" "}
                <a href="mailto:legal@veximglobal.com" className="text-primary hover:underline">
                  legal@veximglobal.com
                </a>
                <br />
                Phone:{" "}
                <a href="tel:0344591641" className="text-primary hover:underline">
                  0344 591 641
                </a>
              </p>
              <p className="text-xs text-muted-foreground">
                Business hours: Monday - Friday, 9:00 AM - 6:00 PM (GMT+7)
              </p>
            </CardContent>
          </Card>

          {/* Acknowledgment */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>
                  By using the VEXIMGLOBAL FSMA 204 Compliance Platform, you acknowledge that you have read, understood,
                  and agree to be bound by these Terms of Service.
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
