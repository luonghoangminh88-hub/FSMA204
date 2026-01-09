import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { RoleBadge } from "@/components/fsma/role-badge"
import { CreditCard, ChevronRight } from "lucide-react"
import Link from "next/link"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  let subscription = null
  if (profile?.organization_id) {
    const { data: subData } = await supabase
      .from("organization_subscriptions")
      .select(
        `
        *,
        service_package:service_packages(package_name, package_tier)
      `,
      )
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    subscription = subData
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" defaultValue={profile?.full_name || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" defaultValue={profile?.phone || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <div className="mt-2">
                <RoleBadge role={profile?.role || "viewer"} />
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {(profile?.role === "system_admin" || profile?.role === "org_admin") && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subscription & Billing</CardTitle>
                <CardDescription>Manage your organization's service plan</CardDescription>
              </div>
              <CreditCard className="size-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current Plan</p>
                  <p className="text-2xl font-bold mt-1">{subscription.service_package?.package_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/dashboard/settings/subscription">
                    View Details
                    <ChevronRight className="size-4 ml-2" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">No Active Subscription</p>
                  <p className="text-sm text-muted-foreground mt-1">Subscribe to unlock all features</p>
                </div>
                <Button asChild>
                  <Link href="/pricing">View Plans</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Language Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Language Preferences</CardTitle>
          <CardDescription>Choose your preferred language</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Language</Label>
            <p className="text-sm">{profile?.language_preference === "vi" ? "Tiếng Việt (Vietnamese)" : "English"}</p>
            <p className="text-xs text-muted-foreground">
              You can change your language using the globe icon in the header
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline">Change Password</Button>
        </CardContent>
      </Card>
    </div>
  )
}
