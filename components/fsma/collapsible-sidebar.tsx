"use client"

import { useState } from "react"
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

interface CollapsibleSidebarProps {
  profile: Profile | null
  organization: Organization | null
}

export function CollapsibleSidebar({ profile, organization }: CollapsibleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
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
      title: t("nav.fdaCompliance"),
      href: "/dashboard/fda-compliance",
      icon: ShieldCheck,
      roles: ["system_admin", "org_admin", "manager"],
    },
    {
      title: t("nav.fdaRegistrations"),
      href: "/dashboard/admin/fda-registrations",
      icon: ShieldCheck,
      roles: ["system_admin"],
    },
    {
      title: t("admin.userManagement"),
      href: "/dashboard/admin/users",
      icon: Users,
      roles: ["system_admin", "org_admin"],
    },
    {
      title: t("admin.servicePackages"),
      href: "/dashboard/admin/packages",
      icon: Package,
      roles: ["system_admin"],
    },
    {
      title: t("admin.subscriptions"),
      href: "/dashboard/admin/subscriptions",
      icon: Receipt,
      roles: ["system_admin"],
    },
    {
      title: t("nav.invoices"),
      href: "/dashboard/admin/invoices",
      icon: FileText,
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
    {
      title: t("nav.lots"),
      href: "/dashboard/lots",
      icon: Package,
      roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
      category: "data",
    },
    ...(hasCTEAccess || profile?.role === "system_admin"
      ? [
          {
            title: t("nav.cteEvents"),
            href: "/dashboard/cte-events",
            icon: FileText,
            roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
            category: "data",
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
    {
      title: t("nav.traceability"),
      href: "/dashboard/traceability",
      icon: Network,
      roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
      category: "traceability",
    },
    {
      title: t("nav.locations"),
      href: "/dashboard/locations",
      icon: MapPin,
      roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
      category: "traceability",
    },
    {
      title: t("nav.recalls"),
      href: "/dashboard/recalls",
      icon: AlertTriangle,
      roles: ["system_admin", "org_admin", "manager"],
      category: "traceability",
    },
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
      title: t("nav.approvals"),
      href: "/dashboard/approvals",
      icon: CheckCircle,
      roles: ["system_admin", "org_admin", "manager"],
      category: "reports",
    },
    {
      title: t("nav.invoices"),
      href: "/dashboard/invoices",
      icon: Receipt,
      roles: ["system_admin", "org_admin", "manager"],
      category: "settings",
    },
    {
      title: t("nav.settings"),
      href: "/dashboard/settings",
      icon: Settings,
      roles: ["system_admin", "org_admin", "manager", "operator", "viewer"],
      category: "settings",
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
      label: t("nav.dataEntry") || "NAV.DATAENTRY",
      items: filteredNavItems.filter((item) => item.category === "data"),
    },
    {
      label: t("nav.traceabilitySection") || "NAV.TRACEABILITYSECTION",
      items: filteredNavItems.filter((item) => item.category === "traceability"),
    },
    {
      label: t("nav.reportsSection") || "NAV.REPORTSSECTION",
      items: filteredNavItems.filter((item) => item.category === "reports"),
    },
    {
      label: "",
      items: filteredNavItems.filter((item) => item.category === "settings"),
    },
  ].filter((group) => group.items.length > 0)

  return (
    <div
      className={cn(
        "relative shadow-2xl glass-strong border-r border-white/10 transition-all duration-300",
        isCollapsed ? "w-20" : "w-72",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center px-6 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2.5 font-black group cursor-pointer w-full"
          >
            <div className="size-10 rounded-2xl gradient-emerald flex items-center justify-center shadow-glow-emerald group-hover:scale-110 transition-transform">
              <ShieldCheck className="size-5 text-white" strokeWidth={2.5} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent leading-none">
                  FSMA 204
                </span>
                <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-wider">COMPLIANCE</span>
              </div>
            )}
          </button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1.5">
            {groupedNavItems.map((group, groupIndex) => (
              <div key={groupIndex}>
                {group.label && !isCollapsed && (
                  <div className="px-3 py-3 mt-4 first:mt-0">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em]">{group.label}</p>
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
                        "w-full h-11 text-[15px] font-bold transition-all rounded-2xl",
                        isCollapsed ? "justify-center px-2" : "justify-start gap-3 px-4",
                        isActive
                          ? "gradient-emerald text-white shadow-glow-emerald hover:opacity-90"
                          : "text-gray-300 hover:bg-white/5 hover:text-white",
                      )}
                      asChild
                      title={isCollapsed ? item.title : undefined}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5 shrink-0" strokeWidth={2.5} />
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </Link>
                    </Button>
                  )
                })}
              </div>
            ))}

            {filteredAdminItems.length > 0 && (
              <>
                <Separator className="my-4 bg-white/10" />
                {!isCollapsed && (
                  <div className="px-3 py-3">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.15em]">
                      {t("admin.administration") || "QUẢN TRỊ"}
                    </p>
                  </div>
                )}
                {filteredAdminItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "default" : "ghost"}
                      size="lg"
                      className={cn(
                        "w-full h-11 text-[15px] font-bold transition-all rounded-2xl",
                        isCollapsed ? "justify-center px-2" : "justify-start gap-3 px-4",
                        isActive
                          ? "gradient-amber text-white shadow-glow-amber hover:opacity-90"
                          : "text-gray-300 hover:bg-white/5 hover:text-white",
                      )}
                      asChild
                      title={isCollapsed ? item.title : undefined}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5 shrink-0" strokeWidth={2.5} />
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </Link>
                    </Button>
                  )
                })}
              </>
            )}
          </nav>
        </ScrollArea>

        <div className="border-t border-white/10 p-4 glass-light">
          {!isCollapsed ? (
            <>
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
            </>
          ) : (
            <div className="space-y-3">
              {organization && <SubscriptionBadge organizationId={organization.id} compact />}

              <div className="flex justify-center">
                <div className="size-11 rounded-full gradient-emerald flex items-center justify-center text-white font-black shadow-glow-emerald text-lg">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
