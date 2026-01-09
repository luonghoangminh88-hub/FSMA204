import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Users, MapPin, Package, HardDrive, AlertCircle } from "lucide-react"
import Link from "next/link"

export default async function SubscriptionSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization:organizations(*)")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Subscription</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No organization associated with your account.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get active subscription
  const { data: subscription } = await supabase
    .from("organization_subscriptions")
    .select(
      `
      *,
      service_package:service_packages(*)
    `,
    )
    .eq("organization_id", profile.organization_id)
    .eq("subscription_status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const pkg = subscription?.service_package

  // Calculate usage percentages
  const userUsage = subscription
    ? ((subscription.current_users_count / (subscription.custom_max_users || pkg?.max_users || 999)) * 100).toFixed(0)
    : 0
  const locationUsage = subscription
    ? (
        (subscription.current_locations_count / (subscription.custom_max_locations || pkg?.max_locations || 999)) *
        100
      ).toFixed(0)
    : 0
  const lotUsage = subscription
    ? (
        (subscription.current_lots_count / (subscription.custom_max_lots_per_month || pkg?.max_lots_per_month || 999)) *
        100
      ).toFixed(0)
    : 0

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription & Billing</h1>
          <p className="text-muted-foreground">Manage your subscription plan and usage</p>
        </div>
      </div>

      {subscription ? (
        <>
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Your active subscription details</CardDescription>
                </div>
                <Badge
                  variant={subscription.subscription_status === "active" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {subscription.subscription_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{pkg?.package_name}</h3>
                  <p className="text-sm text-muted-foreground">{pkg?.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{formatPrice(subscription.base_price)}</p>
                  <p className="text-sm text-muted-foreground capitalize">per {subscription.billing_cycle}</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Users className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Users</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.current_users_count} /{" "}
                      {subscription.custom_max_users || pkg?.max_users || "Unlimited"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <MapPin className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Locations</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.current_locations_count} /{" "}
                      {subscription.custom_max_locations || pkg?.max_locations || "Unlimited"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Package className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Lots This Month</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.current_lots_count} /{" "}
                      {subscription.custom_max_lots_per_month || pkg?.max_lots_per_month || "Unlimited"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <HardDrive className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Storage</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.custom_storage_gb || pkg?.storage_gb || 0} GB
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Billing Details</p>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Billing Date</span>
                    <span className="font-medium">{new Date(subscription.next_billing_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="font-bold text-lg">{formatPrice(subscription.monthly_total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/pricing">Change Plan</Link>
                </Button>
                {subscription.subscription_status === "active" && (
                  <Button variant="destructive">Cancel Subscription</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Details */}
          <Card>
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
              <CardDescription>Track your resource consumption</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Users</span>
                  <span className="font-medium">{userUsage}%</span>
                </div>
                <Progress value={Number(userUsage)} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Locations</span>
                  <span className="font-medium">{locationUsage}%</span>
                </div>
                <Progress value={Number(locationUsage)} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Lots</span>
                  <span className="font-medium">{lotUsage}%</span>
                </div>
                <Progress value={Number(lotUsage)} />
              </div>

              {(Number(userUsage) > 80 || Number(locationUsage) > 80 || Number(lotUsage) > 80) && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="size-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Approaching Limit</p>
                    <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">
                      You're approaching your plan limits. Consider upgrading to avoid service interruption.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-muted">
                  <CreditCard className="size-8 text-muted-foreground" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Active Subscription</h3>
                <p className="text-sm text-muted-foreground">
                  Subscribe to a plan to unlock all features and start managing your food traceability.
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/pricing">View Pricing Plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
