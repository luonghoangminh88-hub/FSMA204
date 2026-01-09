"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, User, FileCheck, Search, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Profile } from "@/lib/types"
import { useLanguage } from "@/hooks/use-language"
import { Input } from "@/components/ui/input"
import { LanguageSwitcher } from "@/components/fsma/language-switcher"
import { NotificationDropdown } from "@/components/fsma/notification-dropdown"
import Link from "next/link"
import { useState, useEffect } from "react"

interface DashboardHeaderProps {
  user: any
  profile: Profile | null
}

export function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const [expiryInfo, setExpiryInfo] = useState<{
    fdaDays: number | null
    agentDays: number | null
  }>({ fdaDays: null, agentDays: null })

  useEffect(() => {
    const fetchExpiryInfo = async () => {
      if (!profile?.organization_id) return

      const { data } = await supabase
        .from("organization_alert_dashboard")
        .select("days_until_fda_renewal, days_until_agent_expiry")
        .eq("id", profile.organization_id)
        .single()

      if (data) {
        setExpiryInfo({
          fdaDays: data.days_until_fda_renewal,
          agentDays: data.days_until_agent_expiry,
        })
      }
    }

    fetchExpiryInfo()
  }, [profile?.organization_id, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || user.email?.[0].toUpperCase()

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-white/10 glass-strong px-6">
      <div className="flex-1 flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            type="search"
            placeholder={t("dashboard.search")}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-2xl h-10 focus-visible:ring-emerald-500/50 text-sm"
          />
        </div>

        {(expiryInfo.fdaDays !== null || expiryInfo.agentDays !== null) && (
          <div className="hidden lg:flex items-center gap-4 text-sm font-medium">
            {expiryInfo.fdaDays !== null && (
              <div className="flex items-center gap-2">
                <Clock className={`size-4 ${expiryInfo.fdaDays < 90 ? "text-rose-400" : "text-emerald-400"}`} />
                <span className={expiryInfo.fdaDays < 90 ? "text-rose-400" : "text-gray-300"}>
                  {t("header.fda")}: {expiryInfo.fdaDays} {t("header.daysLabel")}
                </span>
              </div>
            )}
            {expiryInfo.agentDays !== null && (
              <div className="flex items-center gap-2">
                <Clock className={`size-4 ${expiryInfo.agentDays < 180 ? "text-amber-400" : "text-emerald-400"}`} />
                <span className={expiryInfo.agentDays < 180 ? "text-amber-400" : "text-gray-300"}>
                  {t("header.agent")}: {expiryInfo.agentDays} {t("header.daysLabel")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          asChild
          size="sm"
          className="gradient-rose text-white hover:opacity-90 font-bold rounded-xl shadow-glow-amber h-9 px-4 text-xs hidden md:flex"
        >
          <Link href="/dashboard/fda-compliance">
            <FileCheck className="size-4 mr-2" />
            {t("vexim.manageFacility")}
          </Link>
        </Button>

        <div className="text-gray-300 hover:text-white">
          <LanguageSwitcher />
        </div>

        <NotificationDropdown />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 rounded-2xl px-3 h-10">
              <Avatar className="h-8 w-8 ring-2 ring-emerald-500/30">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ""} />
                <AvatarFallback className="gradient-emerald text-white font-black text-sm">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-bold text-white hidden md:inline">{profile?.full_name || user.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass border-white/10">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-white">{profile?.full_name || "User"}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem asChild>
              <a href="/dashboard/settings" className="text-gray-300 hover:text-white font-medium cursor-pointer">
                <User className="mr-2 size-4" />
                {t("nav.settings")}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/fda-compliance"
                className="text-gray-300 hover:text-white font-medium cursor-pointer flex items-center px-2 py-1.5"
              >
                <FileCheck className="mr-2 size-4" />
                {t("vexim.manageFacility")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={handleLogout} className="text-rose-400 hover:text-rose-300 font-medium">
              <LogOut className="mr-2 size-4" />
              {t("auth.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
