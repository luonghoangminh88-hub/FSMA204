"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { SubscriptionBadge } from "@/components/subscription-badge"
import {
  LayoutDashboard,
  Package,
  FileText,
  MapPin,
  Building2,
  BarChart3,
  Settings,
  ShieldCheck,
  Network,
  LineChart,
  Users,
  AlertCircle,
  Layers,
  CheckCircle,
  AlertTriangle,
  Receipt,
} from "lucide-react"
import type { Profile, Organization } from "@/lib/types"
import { useLanguage } from "@/hooks/use-language"
import { useOrganizationCTEs } from "@/hooks/use-organization-ctes"
import { Separator } from "@/components/ui/separator"

interface DashboardSidebarProps {
  profile: Profile | null
  organization: Organization | null
}

export function DashboardSidebar({ profile, organization }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()

  const { allowedCTEs } = useOrganizationCTEs(organization?.organization_type)
  const hasCTEAccess = allowedCTEs.length > 0

  const adminNavItems = [
    {
      title: t("nav.fdaRequests"),
      href: "/dashboard/fda-requests",
      icon: AlertCircle,
      roles: ["system_admin", "org_admin"],
    },
    {
      title: t("admin.userManagement"),
      href: "/dashboard/admin/users",
      icon: Users,
      roles: ["system_admin", "org_admin"],
    },
    {
      title: "Service Packages",
      href: "/dashboard/admin/packages",
      icon: Package,
      roles: ["system_admin"],
    },
    {
      title: "Subscriptions",
      href: "/dashboard/admin/subscriptions",
      icon: Receipt,
      roles: ["system_admin"],
    },
    {
      title: t("admin.vexImAgent"),
      href: "/dashboard/admin/vexim-agent",
      icon: ShieldCheck,
      roles: ["system_admin"],
    },
    {
      title: t("nav.organizations"),
      href: "/dashboard/organizations",
      icon: Building2,
      roles: ["system_admin"],
    },
  ]

  const navItems = [
    {
      title: t("nav.dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
      category: "overview",
    },

    // Data Entry & Operations
    {
      title: t("nav.lots"),
      href: "/dashboard/lots",
      icon: Package,
      roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
      category: "data",
      tourId: "menu-lots", // Add tour ID
    },
    ...(hasCTEAccess || profile?.role === "system_admin"
      ? [
          {
            title: t("nav.cteEvents"),
            href: "/dashboard/cte-events",
            icon: FileText,
            roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
            category: "data",
            tourId: "menu-cte-events", // Add tour ID
          },
        ]
      : []),
    {
      title: t("nav.batchOperations"),
      href: "/dashboard/batch-operations",
      icon: Layers,
      roles: ["system_admin", "org_admin", "manager", "operator"],
      category: "data",
    },

    // Traceability & Locations
    {
      title: t("nav.traceability"),
      href: "/dashboard/traceability",
      icon: Network,
      roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
      category: "traceability",
      tourId: "menu-traceability", // Add tour ID
    },
    {
      title: t("nav.locations"),
      href: "/dashboard/locations",
      icon: MapPin,
      roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
      category: "traceability",
      tourId: "menu-locations", // Add tour ID
    },
    {
      title: "Quản lý Thu hồi",
      href: "/dashboard/recalls",
      icon: AlertTriangle,
      roles: ["system_admin", "org_admin", "manager"],
      category: "traceability",
    },

    // Analytics & Reports
    {
      title: t("nav.analytics"),
      href: "/dashboard/analytics",
      icon: LineChart,
      roles: ["system_admin", "org_admin", "manager"],
      category: "reports",
    },
    {
      title: t("nav.reports"),
      href: "/dashboard/reports",
      icon: BarChart3,
      roles: ["system_admin", "org_admin", "manager"],
      category: "reports",
    },
    {
      title: t("nav.compliance"),
      href: "/dashboard/compliance",
      icon: ShieldCheck,
      roles: ["system_admin", "org_admin", "manager"],
      category: "reports",
    },
    {
      title: "Phê duyệt",
      href: "/dashboard/approvals",
      icon: CheckCircle,
      roles: ["system_admin", "org_admin", "manager"],
      category: "reports",
      tourId: "menu-approvals", // Add tour ID
    },

    // Settings
    {
      title: t("nav.settings"),
      href: "/dashboard/settings",
      icon: Settings,
      roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
      category: "settings",
      tourId: "menu-settings", // Add tour ID
    },
  ]

  const filteredNavItems = navItems.filter((item) => item.roles.includes(profile?.role || "viewer"))
  const filteredAdminItems = adminNavItems.filter((item) => item.roles.includes(profile?.role || "viewer"))

  const groupedNavItems = [
    {
      label: "",
      items: filteredNavItems.filter((item) => item.category === "overview"),
    },
    {
      label: t("nav.dataEntry") || "NHẬP DỮ LIỆU",
      items: filteredNavItems.filter((item) => item.category === "data"),
    },
    {
      label: t("nav.traceabilitySection") || "TRUY XUẤT NGUỒN GỐC",
      items: filteredNavItems.filter((item) => item.category === "traceability"),
    },
    {
      label: t("nav.reportsSection") || "BÁO CÁO",
      items: filteredNavItems.filter((item) => item.category === "reports"),
    },
    {
      label: "",
      items: filteredNavItems.filter((item) => item.category === "settings"),
    },
  ].filter((group) => group.items.length > 0)

  return (
    <div className="hidden lg:block w-72 shadow-2xl glass-strong">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center px-6 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-black group">
            <div className="size-10 rounded-2xl gradient-emerald flex items-center justify-center shadow-glow-emerald group-hover:scale-110 transition-transform">
              <ShieldCheck className="size-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              FSMA 204
            </span>
          </Link>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1.5">
            {groupedNavItems.map((group, groupIndex) => (
              <div key={groupIndex}>
                {group.label && (
                  <div className="px-3 py-3 mt-4 first:mt-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">{group.label}</p>
                  </div>
                )}
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "default" : "ghost"}
                      size="lg"
                      className={cn(
                        "w-full justify-start gap-3 h-11 text-[15px] font-bold transition-all rounded-2xl",
                        isActive
                          ? "gradient-emerald text-white shadow-glow-emerald hover:opacity-90"
                          : "text-gray-300 hover:bg-white/5 hover:text-white",
                      )}
                      asChild
                      data-tour={item.tourId} // Add data-tour attribute
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5 shrink-0" strokeWidth={2.5} />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </Button>
                  )
                })}
              </div>
            ))}

            {filteredAdminItems.length > 0 && (
              <>
                <Separator className="my-4 bg-white/10" />
                <div className="px-3 py-3">
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.15em]">
                    {t("admin.administration") || "QUẢN TRỊ"}
                  </p>
                </div>
                {filteredAdminItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "default" : "ghost"}
                      size="lg"
                      className={cn(
                        "w-full justify-start gap-3 h-11 text-[15px] font-bold transition-all rounded-2xl",
                        isActive
                          ? "gradient-amber text-white shadow-glow-amber hover:opacity-90"
                          : "text-gray-300 hover:bg-white/5 hover:text-white",
                      )}
                      asChild
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5 shrink-0" strokeWidth={2.5} />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </Button>
                  )
                })}
              </>
            )}
          </nav>
        </ScrollArea>

        <div className="border-t border-white/10 p-4 glass-light">
          {organization && (
            <div className="mb-3">
              <SubscriptionBadge organizationId={organization.id} />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full gradient-emerald flex items-center justify-center text-white font-black shadow-glow-emerald text-lg">
                {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black truncate text-white">{profile?.full_name}</p>
                <Badge
                  variant="secondary"
                  className="text-xs font-bold capitalize mt-1 bg-white/10 text-emerald-400 border-emerald-500/30"
                >
                  {profile?.role?.replace("_", " ")}
                </Badge>
              </div>
            </div>
            {organization && (
              <div className="pl-14">
                <p className="text-xs font-medium text-gray-400 truncate" title={organization.name}>
                  {organization.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
