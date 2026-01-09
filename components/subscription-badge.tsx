"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Zap, TrendingUp, Crown, Sparkles, Loader2 } from "lucide-react"
import Link from "next/link"

interface SubscriptionData {
  hasSubscription: boolean
  package_name?: string
  package_code?: string
  package_tier?: number
  subscription_status?: string
  current_users?: number
  max_users?: number | null
  users_usage_percent?: number | null
  current_locations?: number
  max_locations?: number | null
  locations_usage_percent?: number | null
  current_lots?: number
  max_lots?: number | null
  lots_usage_percent?: number | null
  message?: string
}

interface SubscriptionBadgeProps {
  organizationId: string
  compact?: boolean
}

export function SubscriptionBadge({ organizationId, compact = false }: SubscriptionBadgeProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSubscription() {
      try {
        setLoading(true)
        setError(null)

        console.log("[v0] Fetching subscription status...")
        const response = await fetch("/api/subscription-status")

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch subscription")
        }

        const data = await response.json()
        console.log("[v0] Subscription data received:", data)
        setSubscription(data)
      } catch (error: any) {
        console.error("[v0] Error fetching subscription:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      fetchSubscription()
    }
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="size-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !subscription || !subscription.hasSubscription) {
    return (
      <Link href="/pricing">
        <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10">
          <p className="text-xs text-gray-400 text-center">No active plan</p>
          <p className="text-[10px] text-emerald-400 text-center mt-1 font-bold">Get Started →</p>
        </div>
      </Link>
    )
  }

  const getTierIcon = (tier: number) => {
    switch (tier) {
      case 1:
        return Zap
      case 2:
        return TrendingUp
      case 3:
        return Crown
      case 4:
        return Sparkles
      default:
        return Zap
    }
  }

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1:
        return "from-blue-400 to-blue-600"
      case 2:
        return "from-emerald-400 to-emerald-600"
      case 3:
        return "from-amber-400 to-amber-600"
      case 4:
        return "from-purple-400 to-purple-600"
      default:
        return "from-gray-400 to-gray-600"
    }
  }

  const TierIcon = getTierIcon(subscription.package_tier!)
  const gradientColor = getTierColor(subscription.package_tier!)

  const maxUsage = Math.max(
    subscription.users_usage_percent || 0,
    subscription.locations_usage_percent || 0,
    subscription.lots_usage_percent || 0,
  )

  if (compact) {
    return (
      <Link href="/dashboard/settings/subscription">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
          <div className={`size-8 rounded-lg bg-gradient-to-br ${gradientColor} flex items-center justify-center`}>
            <TierIcon className="size-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{subscription.package_name}</p>
            <p className="text-[10px] text-gray-400">{Math.round(maxUsage)}% used</p>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-2">
      <Link href="/dashboard/settings/subscription">
        <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className={`size-9 rounded-lg bg-gradient-to-br ${gradientColor} flex items-center justify-center`}>
              <TierIcon className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{subscription.package_name}</p>
              <Badge variant="secondary" className="text-[10px] font-bold mt-0.5 h-4 px-1.5 bg-white/10 text-gray-300">
                {subscription.subscription_status}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            {subscription.max_users !== null && subscription.max_users !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400 font-medium">Users</span>
                  <span className="text-gray-300 font-bold">
                    {subscription.current_users}/{subscription.max_users}
                  </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${gradientColor} transition-all`}
                    style={{ width: `${Math.min(subscription.users_usage_percent || 0, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {subscription.max_locations !== null && subscription.max_locations !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400 font-medium">Locations</span>
                  <span className="text-gray-300 font-bold">
                    {subscription.current_locations}/{subscription.max_locations}
                  </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${gradientColor} transition-all`}
                    style={{ width: `${Math.min(subscription.locations_usage_percent || 0, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {subscription.max_lots !== null && subscription.max_lots !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400 font-medium">Lots</span>
                  <span className="text-gray-300 font-bold">
                    {subscription.current_lots}/{subscription.max_lots}
                  </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${gradientColor} transition-all`}
                    style={{ width: `${Math.min(subscription.lots_usage_percent || 0, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
