"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ShieldCheck,
  CheckCircle2,
  Network,
  FileCheck,
  Clock,
  BarChart3,
  AlertTriangle,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  PlayCircle,
  Globe,
  Package,
  Activity,
  Lock,
  Shield,
  Eye,
  Database,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

export default function HomePage() {
  const [language, setLanguage] = useState<"vi" | "en">("vi")

  const t = {
    vi: {
      nav: {
        features: "Tính năng",
        howItWorks: "Cách hoạt động",
        faq: "Câu hỏi",
        pricing: "Bảng giá",
        login: "Đăng nhập",
        trial: "Dùng thử miễn phí",
      },
      hero: {
        badge: "Nền tảng đầu tiên tại Việt Nam",
        title1: "Tuân thủ FDA FSMA 204",
        title2: "Bảo vệ doanh nghiệp xuất khẩu",
        subtitle:
          "Hệ thống quản lý Critical Tracking Events (CTE) và Key Data Elements (KDE) chuyên nghiệp. Tự động hóa 100% truy xuất nguồn gốc thực phẩm theo chuẩn FDA Rule 204.",
        cta: "Dùng thử 14 ngày miễn phí",
        demo: "Xem demo 2 phút",
        benefits: {
          noCard: "Không cần thẻ tín dụng",
          support: "Hỗ trợ 24/7 bằng tiếng Việt",
        },
      },
      stats: {
        compliance: "Tỷ lệ tuân thủ",
        deployment: "Thời gian triển khai",
        companies: "Doanh nghiệp tin dùng",
        penalty: "Phí phạt FDA",
      },
      problem: {
        title: "Thách thức FSMA 204 của doanh nghiệp xuất khẩu",
        fda: {
          title: "Rule 204 có hiệu lực 2026",
          desc: "FDA yêu cầu ghi nhận đầy đủ CTE (Harvesting, Cooling, Initial Packing, Shipping, Receiving, Transformation) và 15+ KDEs. Phản hồi trong 24 giờ.",
        },
        complexity: {
          title: "Quá trình phức tạp",
          desc: "Theo dõi TLC (Traceability Lot Code), KDEs của từng lô FTL qua nhiều địa điểm. Excel không đủ để đáp ứng FDA audit.",
        },
        risk: {
          title: "Rủi ro cao nếu vi phạm",
          desc: "Container bị từ chối nhập khẩu, phạt tiền, đình chỉ FDA registration. Thiệt hại hàng trăm triệu đồng và uy tín doanh nghiệp.",
        },
      },
      solution: {
        title: "VEXIMGLOBAL - Giải pháp FSMA 204 toàn diện",
        subtitle: "Tự động hóa CTE/KDE tracking, đảm bảo tuân thủ FDA Rule 204, tiết kiệm 90% thời gian làm giấy tờ",
        cte: {
          title: "Quản lý 7 loại CTE (Critical Tracking Events)",
          desc: "Ghi nhận Harvesting, Cooling, Initial Packing, Shipping, Receiving, Transformation, First Receiver. Tự động validate trình tự thời gian theo yêu cầu FDA.",
          benefits: [
            "Hỗ trợ đầy đủ 7 loại CTE theo Rule 204",
            "Capture 15+ KDEs bắt buộc tự động",
            "Audit trail đầy đủ",
          ],
        },
        tlc: {
          title: "Truy xuất hai chiều qua TLC (Traceability Lot Code)",
          desc: "Theo dõi từng lô FTL từ nguồn gốc đến điểm đến. Trace backward (nguồn gốc) và forward (phân phối) trong vài giây. Dashboard compliance real-time.",
          benefits: [
            "TLC tự động cho mỗi lô FTL",
            "Truy xuất nguồn gốc chỉ trong 2 phút",
            "Export báo cáo chuẩn FDA PDF/Excel",
          ],
        },
        kde: {
          title: "Ghi nhận KDE (Key Data Elements) đầy đủ",
          desc: "Tự động capture các KDEs: Quantity, Location, Date/Time, Business Name, Phone, FDA Registration... Đối soát số lượng input/output. Cảnh báo thiếu KDE ngay lập tức.",
          benefits: ["15+ KDEs bắt buộc theo Rule 204", "Quantity reconciliation tự động", "Validation tự động"],
        },
        report: {
          title: "Xuất báo cáo FDA chuẩn trong 24 giờ",
          desc: "Export báo cáo theo form FDA Form 3537. Tải về PDF hoặc Excel. Gửi trực tiếp qua FDA Portal Integration. Cảnh báo deadline 24 giờ.",
          benefits: ["Báo cáo chuẩn FDA Form 3537", "Export PDF/Excel tức thì", "FDA Portal Integration"],
        },
      },
      security: {
        title: "Bảo mật cấp ngân hàng - An toàn tuyệt đối",
        subtitle: "Dữ liệu nhạy cảm của bạn được bảo vệ bởi các công nghệ bảo mật hàng đầu thế giới",
        badge: "Enterprise-grade Security",
        encryption: {
          title: "Mã hóa dữ liệu toàn diện",
          desc: "Mọi dữ liệu CTE/KDE được mã hóa AES-256 khi lưu trữ và TLS 1.3 khi truyền tải. Không ai có thể xem được dữ liệu của bạn, kể cả chúng tôi.",
        },
        access: {
          title: "Kiểm soát truy cập nghiêm ngặt",
          desc: "Phân quyền 4 cấp độ (System Admin, Admin, Manager, Operator). Row-level security đảm bảo mỗi doanh nghiệp chỉ xem được dữ liệu của mình. Rate limiting chống brute force.",
        },
        audit: {
          title: "Audit trail đầy đủ mọi thao tác",
          desc: "Ghi lại 100% hành động: ai đã xem, sửa, xóa gì, khi nào, từ đâu. Đáp ứng yêu cầu FDA audit. Không thể xóa hoặc chỉnh sửa log.",
        },
        validation: {
          title: "Validation tự động mọi input",
          desc: "Ngăn chặn SQL injection, XSS attacks. Validate file upload (type, size, malware scan). Tự động phát hiện và chặn các cuộc tấn công phổ biến.",
        },
      },
      howItWorks: {
        title: "3 bước để tuân thủ FSMA 204",
        subtitle: "Triển khai nhanh chóng, dễ dàng sử dụng ngay từ ngày đầu tiên",
        step1: {
          title: "Đăng ký và cấu hình",
          desc: "Tạo tài khoản miễn phí. Import dữ liệu location, supplier, product từ Excel. Hệ thống tự động cấu trúc hóa theo chuẩn FDA.",
        },
        step2: {
          title: "Ghi nhận CTE/KDE hàng ngày",
          desc: "Nhập hoặc quét barcode TLC khi harvest, pack, ship, receive. Hệ thống tự động capture 15+ KDEs và validate đầy đủ.",
        },
        step3: {
          title: "Xuất báo cáo FDA tức thì",
          desc: "Khi FDA yêu cầu, export báo cáo trong 2 phút. Đầy đủ thông tin backward/forward tracing, chuẩn Form 3537.",
        },
        cta: "Bắt đầu ngay - Miễn phí 14 ngày",
      },
      faq: {
        title: "Câu hỏi thường gặp",
        subtitle: "Giải đáp mọi thắc mắc về FSMA 204 và VEXIMGLOBAL",
        q1: {
          q: "FSMA Rule 204 là gì và áp dụng với ai?",
          a: "FSMA Rule 204 yêu cầu các DN xuất khẩu thực phẩm FTL (Food Traceability List) vào Mỹ phải theo dõi Critical Tracking Events (CTE) và Key Data Elements (KDE) đầy đủ. Quy định có hiệu lực từ 20/1/2026. Nếu bạn xuất khẩu hải sản, rau quả vào Mỹ, bạn phải tuân thủ.",
        },
        q2: {
          q: "Hệ thống có khó sử dụng không?",
          a: "Không. VEXIMGLOBAL được thiết kế cực kỳ đơn giản. Giao diện tiếng Việt, hướng dẫn chi tiết từng bước. Đội ngũ hỗ trợ 24/7 bằng tiếng Việt. Nhân viên của bạn học xong trong 30 phút.",
        },
        q3: {
          q: "Chi phí bao nhiêu?",
          a: "Gói Essential chỉ $49/tháng cho 50 lô/tháng. Gói Professional $149/tháng cho 200 lô. Gói Enterprise không giới hạn với giá linh hoạt. Dùng thử miễn phí 14 ngày, không cần thẻ tín dụng.",
        },
        q4: {
          q: "Dữ liệu của tôi có an toàn không?",
          a: "Tuyệt đối an toàn. Dữ liệu được mã hóa AES-256, lưu trữ trên cloud chuẩn SOC2. Chỉ bạn và nhân viên của bạn mới có quyền truy cập. Không ai khác, kể cả chúng tôi, có thể xem dữ liệu của bạn. Backup tự động hàng ngày.",
        },
        q5: {
          q: "Nếu FDA kiểm tra, tôi làm gì?",
          a: "Vào hệ thống, nhập lot code FDA yêu cầu, export báo cáo PDF/Excel. Toàn bộ thông tin CTE/KDE đầy đủ trong 2 phút. Báo cáo chuẩn FDA Form 3537, sẵn sàng gửi FDA Portal.",
        },
        q6: {
          q: "Có hỗ trợ tích hợp với hệ thống ERP hiện tại không?",
          a: "Có. VEXIMGLOBAL cung cấp API để tích hợp với ERP, WMS, hoặc hệ thống quản lý kho hiện tại của bạn. Đội ngũ kỹ thuật sẽ hỗ trợ tích hợp miễn phí cho gói Enterprise.",
        },
      },
      cta: {
        title: "Sẵn sàng tuân thủ FSMA 204?",
        subtitle: "Bắt đầu ngay hôm nay. Dùng thử miễn phí 14 ngày. Không cần thẻ tín dụng.",
        trial: "Dùng thử miễn phí 14 ngày",
        pricing: "Xem bảng giá",
        footer: "Hơn 500 doanh nghiệp xuất khẩu đã tin dùng VEXIMGLOBAL",
      },
      footer: {
        description:
          "Nền tảng FSMA 204 compliance đầu tiên tại Việt Nam. Giúp doanh nghiệp xuất khẩu tuân thủ FDA Rule 204, tránh rủi ro container bị từ chối và phạt tiền.",
        tagline: "Made in Vietnam 🇻🇳",
        product: "Sản phẩm",
        features: "Tính năng",
        pricing: "Bảng giá",
        docs: "Tài liệu",
        api: "API Documentation",
        company: "Công ty",
        about: "Về chúng tôi",
        careers: "Tuyển dụng",
        partners: "Đối tác",
        community: "Cộng đồng",
        contact: "Liên hệ",
        privacy: "Chính sách bảo mật",
        terms: "Điều khoản sử dụng",
        security: "Bảo mật",
      },
    },
    en: {
      nav: {
        features: "Features",
        howItWorks: "How it Works",
        faq: "FAQ",
        pricing: "Pricing",
        login: "Login",
        trial: "Start Free Trial",
      },
      hero: {
        badge: "First Platform in Vietnam",
        title1: "FDA FSMA 204 Compliance",
        title2: "Protect Your Export Business",
        subtitle:
          "Professional Critical Tracking Events (CTE) and Key Data Elements (KDE) management system. 100% automated food traceability per FDA Rule 204.",
        cta: "Start 14-Day Free Trial",
        demo: "Watch 2-min demo",
        benefits: {
          noCard: "No credit card required",
          support: "24/7 support in Vietnamese",
        },
      },
      stats: {
        compliance: "Compliance Rate",
        deployment: "Deployment Time",
        companies: "Trusted Companies",
        penalty: "FDA Penalties",
      },
      problem: {
        title: "FSMA 204 Challenges for Export Businesses",
        fda: {
          title: "Rule 204 Effective 2026",
          desc: "FDA requires full CTE recording (Harvesting, Cooling, Initial Packing, Shipping, Receiving, Transformation) and 15+ KDEs. Response within 24 hours.",
        },
        complexity: {
          title: "Complex Process",
          desc: "Track TLC (Traceability Lot Code) and KDEs of each FTL lot across multiple locations. Excel is insufficient for FDA audits.",
        },
        risk: {
          title: "High Risk of Violation",
          desc: "Containers rejected at import, fines, suspension of FDA registration. Losses of hundreds of millions and company reputation.",
        },
      },
      solution: {
        title: "VEXIMGLOBAL - Comprehensive FSMA 204 Solution",
        subtitle: "Automate CTE/KDE tracking, ensure FDA Rule 204 compliance, save 90% paperwork time",
        cte: {
          title: "Manage 7 Types of CTE (Critical Tracking Events)",
          desc: "Record Harvesting, Cooling, Initial Packing, Shipping, Receiving, Transformation, First Receiver. Auto-validate time sequence per FDA requirements.",
          benefits: [
            "Full support for 7 CTE types per Rule 204",
            "Auto-capture 15+ mandatory KDEs",
            "Complete audit trail",
          ],
        },
        tlc: {
          title: "Bidirectional Traceability via TLC (Traceability Lot Code)",
          desc: "Track each FTL lot from origin to destination. Backward (origin) and forward (distribution) trace in seconds. Real-time compliance dashboard.",
          benefits: [
            "Automatic TLC for each FTL lot",
            "Origin trace in just 2 minutes",
            "Export FDA-standard PDF/Excel reports",
          ],
        },
        kde: {
          title: "Full KDE (Key Data Elements) Recording",
          desc: "Auto-capture KDEs: Quantity, Location, Date/Time, Business Name, Phone, FDA Registration... Reconcile input/output quantities. Instant missing KDE alerts.",
          benefits: ["15+ mandatory KDEs per Rule 204", "Automatic quantity reconciliation", "Automatic validation"],
        },
        report: {
          title: "Export FDA-Standard Reports in 24 Hours",
          desc: "Export reports per FDA Form 3537. Download PDF or Excel. Send directly via FDA Portal Integration. 24-hour deadline alerts.",
          benefits: ["FDA Form 3537 standard reports", "Instant PDF/Excel export", "FDA Portal Integration"],
        },
      },
      security: {
        title: "Bank-grade Security - Absolute Safety",
        subtitle: "Your sensitive data protected by world-class security technologies",
        badge: "Enterprise-grade Security",
        encryption: {
          title: "Comprehensive Data Encryption",
          desc: "All CTE/KDE data encrypted with AES-256 at rest and TLS 1.3 in transit. No one can view your data, not even us.",
        },
        access: {
          title: "Strict Access Control",
          desc: "4-level permissions (System Admin, Admin, Manager, Operator). Row-level security ensures each company only sees their own data. Rate limiting prevents brute force attacks.",
        },
        audit: {
          title: "Complete Audit Trail of All Actions",
          desc: "Records 100% of actions: who viewed, edited, deleted what, when, from where. Meets FDA audit requirements. Logs cannot be deleted or modified.",
        },
        validation: {
          title: "Automatic Input Validation",
          desc: "Prevents SQL injection, XSS attacks. Validates file uploads (type, size, malware scan). Automatically detects and blocks common attacks.",
        },
      },
      howItWorks: {
        title: "3 Steps to FSMA 204 Compliance",
        subtitle: "Quick deployment, easy to use from day one",
        step1: {
          title: "Register and Configure",
          desc: "Create free account. Import location, supplier, product data from Excel. System auto-structures per FDA standards.",
        },
        step2: {
          title: "Record Daily CTE/KDE",
          desc: "Enter or scan TLC barcode when harvesting, packing, shipping, receiving. System auto-captures 15+ KDEs and validates completely.",
        },
        step3: {
          title: "Export FDA Reports Instantly",
          desc: "When FDA requests, export report in 2 minutes. Complete backward/forward tracing info, standard Form 3537.",
        },
        cta: "Start Now - Free 14 Days",
      },
      faq: {
        title: "Frequently Asked Questions",
        subtitle: "Answers to all questions about FSMA 204 and VEXIMGLOBAL",
        q1: {
          q: "What is FSMA Rule 204 and who does it apply to?",
          a: "FSMA Rule 204 requires businesses exporting FTL (Food Traceability List) foods to the US to track Critical Tracking Events (CTE) and Key Data Elements (KDE) completely. Effective from January 20, 2026. If you export seafood or produce to the US, you must comply.",
        },
        q2: {
          q: "Is the system difficult to use?",
          a: "No. VEXIMGLOBAL is designed to be extremely simple. Vietnamese interface, step-by-step instructions. 24/7 support team in Vietnamese. Your staff can learn in 30 minutes.",
        },
        q3: {
          q: "How much does it cost?",
          a: "Essential plan only $49/month for 50 lots/month. Professional plan $149/month for 200 lots. Enterprise plan unlimited with flexible pricing. Free 14-day trial, no credit card required.",
        },
        q4: {
          q: "Is my data safe?",
          a: "Absolutely safe. Data encrypted with AES-256, stored on SOC2-compliant cloud. Only you and your staff have access. No one else, not even us, can view your data. Automatic daily backups.",
        },
        q5: {
          q: "If FDA inspects, what do I do?",
          a: "Log into system, enter lot code FDA requested, export PDF/Excel report. All CTE/KDE information complete in 2 minutes. FDA Form 3537 standard report, ready to send to FDA Portal.",
        },
        q6: {
          q: "Does it integrate with current ERP systems?",
          a: "Yes. VEXIMGLOBAL provides API to integrate with ERP, WMS, or your current warehouse management system. Technical team will support free integration for Enterprise plan.",
        },
      },
      cta: {
        title: "Ready for FSMA 204 Compliance?",
        subtitle: "Start today. Free 14-day trial. No credit card required.",
        trial: "Start 14-Day Free Trial",
        pricing: "View Pricing",
        footer: "Over 500 export businesses trust VEXIMGLOBAL",
      },
      footer: {
        description:
          "First FSMA 204 compliance platform in Vietnam. Helps export businesses comply with FDA Rule 204, avoid container rejection and fines.",
        tagline: "Made in Vietnam 🇻🇳",
        product: "Product",
        features: "Features",
        pricing: "Pricing",
        docs: "Documentation",
        api: "API Documentation",
        company: "Company",
        about: "About Us",
        careers: "Careers",
        partners: "Partners",
        community: "Community",
        contact: "Contact",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        security: "Security",
      },
    },
  }

  const content = t[language]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-emerald rounded-xl flex items-center justify-center shadow-glow-emerald">
              <ShieldCheck className="size-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-black text-foreground">VEXIMGLOBAL</div>
              <div className="text-xs text-primary font-semibold">FSMA 204 Compliance</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground hover:text-primary font-semibold transition-colors">
              {content.nav.features}
            </a>
            <a href="#how-it-works" className="text-foreground hover:text-primary font-semibold transition-colors">
              {content.nav.howItWorks}
            </a>
            <a href="#faq" className="text-foreground hover:text-primary font-semibold transition-colors">
              {content.nav.faq}
            </a>
            <a href="/dashboard/pricing" className="text-foreground hover:text-primary font-semibold transition-colors">
              {content.nav.pricing}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
              className="hidden md:inline-flex"
            >
              <Globe className="size-4 mr-2" />
              {language === "vi" ? "EN" : "VI"}
            </Button>
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link href="/auth/login">{content.nav.login}</Link>
            </Button>
            <Button asChild className="gradient-emerald shadow-glow-emerald">
              <Link href="/auth/sign-up">{content.nav.trial}</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <Badge className="gradient-emerald shadow-glow-emerald text-white px-6 py-2 text-sm font-bold border-0">
              {content.hero.badge}
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black text-foreground leading-tight text-balance">
              {content.hero.title1}
              <br />
              <span className="text-primary">{content.hero.title2}</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed text-balance">
              {content.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="gradient-emerald shadow-glow-emerald h-14 px-8 text-lg">
                <Link href="/auth/sign-up">
                  {content.hero.cta}
                  <ChevronRight className="ml-2 size-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 bg-transparent">
                <PlayCircle className="mr-2 size-5" />
                {content.hero.demo}
              </Button>
            </div>
            <div className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-primary flex-shrink-0" />
                <span>{content.hero.benefits.noCard}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-primary flex-shrink-0" />
                <span>{content.hero.benefits.support}</span>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 glass rounded-3xl">
            <div className="text-center">
              <div className="text-4xl font-black text-primary">98%</div>
              <div className="text-sm text-muted-foreground mt-1">{content.stats.compliance}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-primary">2 {language === "vi" ? "giờ" : "hrs"}</div>
              <div className="text-sm text-muted-foreground mt-1">{content.stats.deployment}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-primary">500+</div>
              <div className="text-sm text-muted-foreground mt-1">{content.stats.companies}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-primary">$0</div>
              <div className="text-sm text-muted-foreground mt-1">{content.stats.penalty}</div>
            </div>
          </div>
        </section>

        <section className="bg-card/50 py-20 md:py-32 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 text-balance text-foreground">
                  {content.problem.title}
                </h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                <ProblemCard
                  icon={<AlertTriangle className="size-8" />}
                  title={content.problem.fda.title}
                  description={content.problem.fda.desc}
                />
                <ProblemCard
                  icon={<FileCheck className="size-8" />}
                  title={content.problem.complexity.title}
                  description={content.problem.complexity.desc}
                />
                <ProblemCard
                  icon={<Clock className="size-8" />}
                  title={content.problem.risk.title}
                  description={content.problem.risk.desc}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-balance text-foreground">
                {content.solution.title}
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{content.solution.subtitle}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <FeatureCard
                icon={<Activity className="size-7" />}
                title={content.solution.cte.title}
                description={content.solution.cte.desc}
                benefits={content.solution.cte.benefits}
                gradient="gradient-emerald"
              />
              <FeatureCard
                icon={<Network className="size-7" />}
                title={content.solution.tlc.title}
                description={content.solution.tlc.desc}
                benefits={content.solution.tlc.benefits}
                gradient="gradient-blue"
              />
              <FeatureCard
                icon={<Package className="size-7" />}
                title={content.solution.kde.title}
                description={content.solution.kde.desc}
                benefits={content.solution.kde.benefits}
                gradient="gradient-purple"
              />
              <FeatureCard
                icon={<BarChart3 className="size-7" />}
                title={content.solution.report.title}
                description={content.solution.report.desc}
                benefits={content.solution.report.benefits}
                gradient="gradient-amber"
              />
            </div>
          </div>
        </section>

        <section className="relative py-20 md:py-32 overflow-hidden border-y border-border">
          <div className="absolute inset-0 bg-gradient-to-b from-card/50 via-background to-card/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <Badge className="gradient-blue shadow-glow-blue text-white px-6 py-2 text-sm font-bold border-0 mb-6">
                  {content.security.badge}
                </Badge>
                <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 text-balance">
                  {content.security.title}
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{content.security.subtitle}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <SecurityCard
                  icon={<Lock className="size-7" />}
                  title={content.security.encryption.title}
                  description={content.security.encryption.desc}
                  gradient="gradient-blue"
                />
                <SecurityCard
                  icon={<Shield className="size-7" />}
                  title={content.security.access.title}
                  description={content.security.access.desc}
                  gradient="gradient-emerald"
                />
                <SecurityCard
                  icon={<Eye className="size-7" />}
                  title={content.security.audit.title}
                  description={content.security.audit.desc}
                  gradient="gradient-purple"
                />
                <SecurityCard
                  icon={<Database className="size-7" />}
                  title={content.security.validation.title}
                  description={content.security.validation.desc}
                  gradient="gradient-amber"
                />
              </div>

              <div className="mt-12 p-8 glass-strong rounded-2xl border border-primary/20 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <ShieldCheck className="size-8 text-primary" />
                  <span className="text-2xl font-black text-foreground">
                    {language === "vi"
                      ? "Tuân thủ chuẩn bảo mật quốc tế"
                      : "International Security Standards Compliant"}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {language === "vi"
                    ? "ISO 27001 ready • SOC 2 Type II compliant • GDPR compliant • FDA 21 CFR Part 11 ready"
                    : "ISO 27001 ready • SOC 2 Type II compliant • GDPR compliant • FDA 21 CFR Part 11 ready"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-card/30 py-20 md:py-32 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 text-balance">
                {content.howItWorks.title}
              </h2>
              <p className="text-xl text-muted-foreground">{content.howItWorks.subtitle}</p>
            </div>

            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
              <StepCard
                number="01"
                title={content.howItWorks.step1.title}
                description={content.howItWorks.step1.desc}
              />
              <StepCard
                number="02"
                title={content.howItWorks.step2.title}
                description={content.howItWorks.step2.desc}
              />
              <StepCard
                number="03"
                title={content.howItWorks.step3.title}
                description={content.howItWorks.step3.desc}
              />
            </div>

            <div className="text-center mt-12">
              <Button size="lg" className="gradient-emerald shadow-glow-emerald h-14 px-8 text-lg" asChild>
                <Link href="/auth/sign-up">
                  {content.howItWorks.cta}
                  <ChevronRight className="ml-2 size-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="faq" className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 text-balance">{content.faq.title}</h2>
              <p className="text-xl text-muted-foreground">{content.faq.subtitle}</p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => {
                const key = `q${i}` as keyof typeof content.faq
                const item = content.faq[key] as { q: string; a: string }
                return (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="glass-strong rounded-2xl px-6 border border-border"
                  >
                    <AccordionTrigger className="text-lg font-bold text-left hover:no-underline py-6 text-foreground">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-6 leading-relaxed text-base">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        </section>

        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Background effects matching dashboard style */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-4xl md:text-6xl font-black text-balance bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">
                {content.cta.title}
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {content.cta.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  size="lg"
                  asChild
                  className="bg-primary text-white hover:bg-primary/90 h-14 px-8 text-lg font-bold shadow-glow-emerald"
                >
                  <Link href="/auth/sign-up">
                    {content.cta.trial}
                    <ChevronRight className="ml-2 size-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg border-2 border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50 bg-transparent"
                  asChild
                >
                  <Link href="/dashboard/pricing">{content.cta.pricing}</Link>
                </Button>
              </div>
              <div className="pt-4 text-sm text-muted-foreground">{content.cta.footer}</div>
            </div>
          </div>
        </section>

        <footer className="bg-card py-16 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 gradient-emerald rounded-xl flex items-center justify-center shadow-glow-emerald">
                    <ShieldCheck className="size-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-foreground">VEXIMGLOBAL</div>
                    <div className="text-xs text-primary">FSMA 204 Compliance</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{content.footer.description}</p>
                <Badge className="gradient-emerald text-white border-0">{content.footer.tagline}</Badge>
              </div>

              <div>
                <h4 className="font-bold mb-4 text-foreground">{content.footer.product}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#features" className="hover:text-primary transition-colors">
                      {content.footer.features}
                    </a>
                  </li>
                  <li>
                    <a href="/dashboard/pricing" className="hover:text-primary transition-colors">
                      {content.footer.pricing}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      {content.footer.docs}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      {content.footer.api}
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-4 text-foreground">{content.footer.company}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      {content.footer.about}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      {content.footer.careers}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      {content.footer.partners}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-primary transition-colors">
                      {content.footer.community}
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-4 text-foreground">{content.footer.contact}</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <MapPin className="size-4 mt-1 text-primary flex-shrink-0" />
                    <span>Số 25/6/51 Ngoa Long, Tay Tuu, Ha Noi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="size-4 text-primary flex-shrink-0" />
                    <a href="tel:0344591641" className="hover:text-primary transition-colors">
                      0344 591 641
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="size-4 text-primary flex-shrink-0" />
                    <a href="mailto:support@veximglobal.com" className="hover:text-primary transition-colors">
                      support@veximglobal.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Link href="/privacy-policy" className="hover:text-primary transition-colors">
                  {content.footer.privacy}
                </Link>
                <span>•</span>
                <Link href="/terms-of-service" className="hover:text-primary transition-colors">
                  {content.footer.terms}
                </Link>
              </div>
              <p>&copy; 2026 VEXIMGLOBAL. {language === "vi" ? "Bảo lưu mọi quyền" : "All rights reserved"}.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

function ProblemCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass-strong p-6 rounded-2xl space-y-4 border border-border hover:border-primary/50 transition-colors">
      <div className="w-14 h-14 gradient-rose rounded-xl flex items-center justify-center text-white shadow-glow-amber">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  benefits,
  gradient,
}: {
  icon: React.ReactNode
  title: string
  description: string
  benefits: string[]
  gradient: string
}) {
  return (
    <div className="glass-strong p-8 rounded-2xl space-y-4 border border-border hover:border-primary/50 transition-all hover:shadow-glow-emerald">
      <div
        className={`w-14 h-14 ${gradient} rounded-xl flex items-center justify-center text-white shadow-glow-emerald`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
      <ul className="space-y-2 pt-2">
        {benefits.map((benefit, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 className="size-5 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground">{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SecurityCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}) {
  return (
    <div className="glass-strong p-8 rounded-2xl space-y-4 border border-border hover:border-primary/50 transition-all hover:shadow-glow-emerald group">
      <div
        className={`w-14 h-14 ${gradient} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="glass-strong p-8 rounded-2xl space-y-4 border border-border relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="text-6xl font-black text-primary/10 absolute -top-2 -right-2 group-hover:text-primary/20 transition-colors">
        {number}
      </div>
      <div className="relative z-10">
        <div className="w-12 h-12 gradient-emerald rounded-xl flex items-center justify-center text-white font-black text-lg mb-4 shadow-glow-emerald">
          {number}
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
