"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Star, Zap, Building2, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PackageFeature {
  id: string
  package_id: string
  feature_category: string
  feature_name: string
  feature_description: string | null
  is_included: boolean
  display_order: number
}

interface ServicePackage {
  id: string
  package_name: string
  package_code: string
  package_tier: number
  description: string
  price_monthly: number
  price_yearly: number | null
  max_users: number | null
  max_locations: number | null
  max_lots_per_month: number | null
  storage_gb: number
  is_popular: boolean
  is_featured: boolean
  tagline: string | null
  support_level: string
  features: PackageFeature[]
}

interface CurrentSubscription {
  package_code: string
  subscription_status: string
  billing_cycle: string
}

export default function PricingPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null)
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null)

  useEffect(() => {
    loadPackages()
    loadCurrentSubscription()
  }, [])

  const loadCurrentSubscription = async () => {
    try {
      const response = await fetch("/api/subscription-status")
      if (response.ok) {
        const data = await response.json()
        if (data.subscription && data.subscription.subscription_status === "active") {
          setCurrentSubscription({
            package_code: data.subscription.package_code,
            subscription_status: data.subscription.subscription_status,
            billing_cycle: data.subscription.billing_cycle,
          })
          setBillingCycle(data.subscription.billing_cycle)
        }
      }
    } catch (error) {
      console.error("[v0] Error loading current subscription:", error)
    }
  }

  const loadPackages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/packages")
      const data = await response.json()

      if (response.ok) {
        const activePackages = data.packages?.filter((p: any) => p.is_active && p.is_public) || []
        setPackages(activePackages)
      }
    } catch (error: any) {
      console.error("[v0] Error loading packages:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getTierIcon = (tier: number) => {
    const icons = [
      <Zap className="size-6 text-blue-600" key="starter" />,
      <Star className="size-6 text-purple-600" key="professional" />,
      <Building2 className="size-6 text-orange-600" key="enterprise" />,
      <Sparkles className="size-6 text-pink-600" key="white-label" />,
    ]
    return icons[tier - 1] || icons[0]
  }

  const isCurrentPlan = (packageCode: string) => {
    return currentSubscription?.package_code === packageCode
  }

  const getActionType = (packageTier: number) => {
    if (!currentSubscription) return "subscribe"
    const currentPackage = packages.find((p) => p.package_code === currentSubscription.package_code)
    if (!currentPackage) return "subscribe"
    if (packageTier > currentPackage.package_tier) return "upgrade"
    if (packageTier < currentPackage.package_tier) return "downgrade"
    return "current"
  }

  const handleSelectPackage = async (pkg: ServicePackage) => {
    if (pkg.package_code === "white_label") {
      toast({
        title: "Contact Sales",
        description: "Please contact our sales team for White Label pricing and custom solutions.",
      })
      return
    }

    if (isCurrentPlan(pkg.package_code)) {
      toast({
        title: "Current Plan",
        description: "You are already subscribed to this plan.",
      })
      return
    }

    setIsCreatingInvoice(true)
    try {
      const response = await fetch("/api/invoices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_code: pkg.package_code,
          billing_cycle: billingCycle,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create subscription")
      }

      setCreatedInvoiceId(data.invoice_id)
      setShowPaymentDialog(true)

      toast({
        title: "Subscription Created",
        description: "Your invoice has been generated. Please proceed with payment.",
      })
    } catch (error: any) {
      console.error("[v0] Error creating subscription:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  const handleViewInvoice = () => {
    setShowPaymentDialog(false)
    router.push("/dashboard/invoices")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Choose the perfect plan for your FSMA 204 compliance needs. All plans include core traceability features.
        </p>

        <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingCycle === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingCycle === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <Badge variant="secondary" className="ml-2">
              Save 10%
            </Badge>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading pricing plans...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg) => {
            const price = billingCycle === "yearly" && pkg.price_yearly ? pkg.price_yearly / 12 : pkg.price_monthly
            const totalPrice = billingCycle === "yearly" && pkg.price_yearly ? pkg.price_yearly : pkg.price_monthly
            const isCurrent = isCurrentPlan(pkg.package_code)
            const actionType = getActionType(pkg.package_tier)

            return (
              <Card
                key={pkg.id}
                className={`relative flex flex-col ${
                  pkg.is_popular && !isCurrent ? "border-primary shadow-lg scale-105" : ""
                } ${pkg.is_featured && !isCurrent ? "border-2 border-orange-500" : ""} ${
                  isCurrent ? "border-2 border-green-500" : ""
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-500 text-white">Current Plan</Badge>
                  </div>
                )}
                {!isCurrent && pkg.is_popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                {!isCurrent && pkg.is_featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-orange-500 text-white">Best Value</Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    {getTierIcon(pkg.package_tier)}
                    <CardTitle className="text-2xl">{pkg.package_name}</CardTitle>
                  </div>
                  <CardDescription className="text-sm line-clamp-2">{pkg.tagline || pkg.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{formatPrice(price)}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                    {billingCycle === "yearly" && pkg.price_yearly && (
                      <p className="text-sm text-muted-foreground mt-1">Billed {formatPrice(totalPrice)} annually</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Limits</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-green-600 shrink-0" />
                          <span>{pkg.max_users ? `Up to ${pkg.max_users} users` : "Unlimited users"}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-green-600 shrink-0" />
                          <span>{pkg.max_locations ? `${pkg.max_locations} locations` : "Unlimited locations"}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-green-600 shrink-0" />
                          <span>
                            {pkg.max_lots_per_month ? `${pkg.max_lots_per_month} lots/month` : "Unlimited lots"}
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-green-600 shrink-0" />
                          <span>{pkg.storage_gb} GB storage</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2">Key Features</h4>
                      <ul className="space-y-2 text-sm">
                        {pkg.features
                          .filter((f) => f.is_included)
                          .slice(0, 5)
                          .map((feature) => (
                            <li key={feature.id} className="flex items-start gap-2">
                              <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{feature.feature_name}</span>
                            </li>
                          ))}
                        {pkg.features.filter((f) => !f.is_included).length > 0 && (
                          <li className="flex items-start gap-2 text-muted-foreground">
                            <X className="size-4 shrink-0 mt-0.5" />
                            <span>
                              {pkg.features.filter((f) => !f.is_included).length} advanced features not included
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={pkg.is_popular && !isCurrent ? "default" : "outline"}
                    onClick={() => handleSelectPackage(pkg)}
                    disabled={isCurrent || isCreatingInvoice}
                  >
                    {isCurrent
                      ? "Current Plan"
                      : pkg.package_code === "white_label"
                        ? "Contact Sales"
                        : actionType === "upgrade"
                          ? "Upgrade"
                          : actionType === "downgrade"
                            ? "Downgrade"
                            : "Get Started"}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">All Plans Include</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="font-semibold mb-2">Full CTE Tracking</h3>
            <p className="text-sm text-muted-foreground">Track all 7 Critical Tracking Events required by FSMA 204</p>
          </div>
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="font-semibold mb-2">24-Hour FDA Response</h3>
            <p className="text-sm text-muted-foreground">Generate compliant reports within FDA's deadline</p>
          </div>
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="font-semibold mb-2">Secure & Compliant</h3>
            <p className="text-sm text-muted-foreground">Multi-organization support with role-based access</p>
          </div>
        </div>
      </div>

      <div className="mt-16 text-center">
        <p className="text-muted-foreground mb-4">
          Need help choosing the right plan?{" "}
          <a href="mailto:sales@fsma204.com" className="text-primary hover:underline font-medium">
            Contact our sales team
          </a>
        </p>
        <p className="text-sm text-muted-foreground">
          All prices in USD. All plans include 14-day free trial, no credit card required.
        </p>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Instructions</DialogTitle>
            <DialogDescription>
              Your subscription has been created. Please follow the payment instructions below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-semibold mb-2">Bank Transfer Details:</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Bank:</strong> Vietcombank
                </p>
                <p>
                  <strong>Account Name:</strong> VEXIM GLOBAL FSMA 204
                </p>
                <p>
                  <strong>Account Number:</strong> 0123456789
                </p>
                <p>
                  <strong>Content:</strong> INV-{createdInvoiceId?.slice(0, 8)}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Important:</strong> Please include the invoice reference in your transfer content for automatic
                processing.
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>After payment:</p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Upload your payment proof in the Invoices page</li>
                <li>Our team will verify within 2-24 hours</li>
                <li>Your subscription will be activated automatically</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Close
            </Button>
            <Button onClick={handleViewInvoice}>View Invoice & Upload Proof</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
