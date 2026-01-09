import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CollapsibleSidebar } from "@/components/fsma/collapsible-sidebar"
import { DashboardHeader } from "@/components/fsma/dashboard-header"
import { PermissionsProvider } from "@/hooks/use-permissions"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile?.organization_id) {
    redirect("/auth/onboarding")
  }

  const { data: organization } = profile?.organization_id
    ? await supabase.from("organizations").select("*").eq("id", profile.organization_id).single()
    : { data: null }

  return (
    <PermissionsProvider userRole={profile?.role || "viewer"}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-[#080a11] via-[#0f1419] to-[#080a11]">
        <CollapsibleSidebar profile={profile} organization={organization} />
        <div className="flex flex-1 flex-col">
          <DashboardHeader user={user} profile={profile} />
          <main className="flex-1 p-6 lg:p-10 overflow-y-auto">{children}</main>
        </div>
      </div>
    </PermissionsProvider>
  )
}
