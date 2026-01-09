"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"

interface PricingTier {
  name: string
  code: string
  price: number
  yearlyPrice?: number
  description: string
  features: { name: string; included: boolean }[]
  popular?: boolean
  cta: string
}

interface PricingTableProps {
  billingCycle: "monthly" | "yearly"
  onSelectPlan: (code: string) => void
}

export function PricingTable({ billingCycle, onSelectPlan }: PricingTableProps) {
  const tiers: PricingTier[] = [
    {
      name: "Starter",
      code: "starter",
      price: 199,
      yearlyPrice: 2149,
      description: "Perfect for small manufacturers getting started with FSMA compliance",
      features: [
        { name: "Up to 5 users", included: true },
        { name: "2 Locations", included: true },
        { name: "500 Lots/month", included: true },
        { name: "Basic CTE Management", included: true },
        { name: "Email Support (48h)", included: true },
        { name: "100 GB Storage", included: true },
        { name: "Batch Operations", included: false },
        { name: "US Agent Service", included: false },
        { name: "API Access", included: false },
      ],
      cta: "Start Free Trial",
    },
    {
      name: "Professional",
      code: "professional",
      price: 599,
      yearlyPrice: 6469,
      description: "Complete solution for mid-size manufacturers and processors",
      features: [
        { name: "Up to 25 users", included: true },
        { name: "10 Locations", included: true },
        { name: "2,500 Lots/month", included: true },
        { name: "Full Supply Chain Traceability", included: true },
        { name: "US Agent Service (FREE)", included: true },
        { name: "Batch Operations", included: true },
        { name: "Loss Analytics", included: true },
        { name: "Priority Support (24h)", included: true },
        { name: "500 GB Storage", included: true },
        { name: "TLC Auto-Generation", included: false },
        { name: "API Access", included: false },
      ],
      popular: true,
      cta: "Start Free Trial",
    },
    {
      name: "Enterprise",
      code: "enterprise",
      price: 1999,
      yearlyPrice: 21589,
      description: "Comprehensive solution for large corporations",
      features: [
        { name: "Unlimited Users", included: true },
        { name: "Unlimited Locations", included: true },
        { name: "Unlimited Lots", included: true },
        { name: "Everything in Professional", included: true },
        { name: "TLC Auto-Generation", included: true },
        { name: "Approval Workflows", included: true },
        { name: "Full API Access", included: true },
        { name: "Dedicated Account Manager", included: true },
        { name: "Phone Support (4h)", included: true },
        { name: "5 TB Storage", included: true },
        { name: "99.9% Uptime SLA", included: true },
      ],
      cta: "Contact Sales",
    },
    {
      name: "White Label",
      code: "white_label",
      price: 0,
      description: "Fully customizable platform for consultants and resellers",
      features: [
        { name: "Everything in Enterprise", included: true },
        { name: "Full White Label Branding", included: true },
        { name: "Multi-Tenant Architecture", included: true },
        { name: "Reseller Dashboard", included: true },
        { name: "Revenue Sharing Options", included: true },
        { name: "Co-Marketing Support", included: true },
        { name: "Dedicated Technical Support", included: true },
        { name: "10 TB Storage", included: true },
      ],
      cta: "Contact Sales",
    },
  ]

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getDisplayPrice = (tier: PricingTier) => {
    if (tier.code === "white_label") return "Custom"
    const price = billingCycle === "yearly" && tier.yearlyPrice ? tier.yearlyPrice / 12 : tier.price
    return formatPrice(price)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {tiers.map((tier) => (
        <Card key={tier.code} className={`relative flex flex-col ${tier.popular ? "border-primary shadow-lg" : ""}`}>
          {tier.popular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary">Most Popular</Badge>
            </div>
          )}

          <CardHeader>
            <CardTitle>{tier.name}</CardTitle>
            <CardDescription className="text-sm">{tier.description}</CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{getDisplayPrice(tier)}</span>
                {tier.code !== "white_label" && <span className="text-muted-foreground">/mo</span>}
              </div>
              {billingCycle === "yearly" && tier.yearlyPrice && tier.code !== "white_label" && (
                <p className="text-sm text-muted-foreground mt-1">Billed {formatPrice(tier.yearlyPrice)} annually</p>
              )}
            </div>

            <ul className="space-y-2 text-sm">
              {tier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  {feature.included ? (
                    <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <X className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <span className={feature.included ? "" : "text-muted-foreground"}>{feature.name}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              variant={tier.popular ? "default" : "outline"}
              onClick={() => onSelectPlan(tier.code)}
            >
              {tier.cta}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
