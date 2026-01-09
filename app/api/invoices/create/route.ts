import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createInvoiceSchema } from "@/lib/validation/schemas"
import { validateRequest, sanitizeError } from "@/lib/validation/validator"
import { withRateLimit, RateLimitConfig } from "@/lib/security/with-rate-limit"

export const POST = withRateLimit(async (request: Request) => {
  const supabase = await createClient()

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error("[v0] Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = await validateRequest(createInvoiceSchema, body)

    if (validation instanceof NextResponse) {
      return validation // Validation failed, return error response
    }

    const { package_code, billing_cycle } = validation.data!

    console.log("[v0] Invoice creation request:", { package_code, billing_cycle, user_id: user.id })

    // Step 1: Get user profile and organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      console.error("[v0] Profile error:", profileError)
      return NextResponse.json({ error: "User has no organization" }, { status: 400 })
    }

    console.log("[v0] Profile loaded:", { organization_id: profile.organization_id })

    // Step 2: Check existing subscription
    const { data: existingSubscription } = await supabase
      .from("organization_subscriptions")
      .select("id, subscription_status, package_id, service_packages(package_code, package_tier)")
      .eq("organization_id", profile.organization_id)
      .eq("subscription_status", "active")
      .maybeSingle()

    console.log("[v0] Existing subscription:", existingSubscription)

    // Step 3: Get package data
    const { data: packageData, error: packageError } = await supabase
      .from("service_packages")
      .select("*")
      .eq("package_code", package_code)
      .eq("is_active", true)
      .single()

    if (packageError || !packageData) {
      console.error("[v0] Package error:", packageError)
      return NextResponse.json({ error: "Invalid package" }, { status: 400 })
    }

    console.log("[v0] Package loaded:", {
      id: packageData.id,
      name: packageData.package_name,
      price_monthly: packageData.price_monthly,
      price_yearly: packageData.price_yearly,
    })

    // Step 4: Check if already subscribed to this package
    if (
      existingSubscription &&
      existingSubscription.service_packages &&
      Array.isArray(existingSubscription.service_packages)
    ) {
      const servicePackage = existingSubscription.service_packages[0]
      if (servicePackage?.package_code === package_code) {
        return NextResponse.json(
          { error: "You are already subscribed to this package. Please choose a different one." },
          { status: 400 },
        )
      }
    }

    // Step 5: Determine upgrade/downgrade
    let isUpgrade = false
    let isDowngrade = false
    if (
      existingSubscription &&
      existingSubscription.service_packages &&
      Array.isArray(existingSubscription.service_packages)
    ) {
      const servicePackage = existingSubscription.service_packages[0]
      if (servicePackage) {
        const currentTier = servicePackage.package_tier
        const newTier = packageData.package_tier
        isUpgrade = newTier > currentTier
        isDowngrade = newTier < currentTier
      }
    }

    // Step 6: Calculate billing
    const billingCycleValue = billing_cycle || "monthly"
    const isYearly = billingCycleValue === "yearly"
    const price = isYearly ? packageData.price_yearly : packageData.price_monthly
    const billingPeriodMonths = isYearly ? 12 : 1

    const today = new Date()
    const billingPeriodStart = today.toISOString().split("T")[0]
    const billingPeriodEnd = new Date(today.setMonth(today.getMonth() + billingPeriodMonths))
      .toISOString()
      .split("T")[0]

    let subscriptionStatus = "pending"
    if (existingSubscription) {
      subscriptionStatus = isUpgrade ? "pending_upgrade" : "pending_downgrade"
    }

    console.log("[v0] Billing calculation:", {
      billing_cycle: billingCycleValue,
      is_yearly: isYearly,
      price: price,
      period_start: billingPeriodStart,
      period_end: billingPeriodEnd,
      status: subscriptionStatus,
    })

    // Step 7: Create subscription
    const subscriptionInsertData = {
      organization_id: profile.organization_id,
      package_id: packageData.id,
      subscription_status: subscriptionStatus,
      billing_cycle: billingCycleValue,
      subscription_start_date: billingPeriodStart,
      subscription_end_date: billingPeriodEnd,
      next_billing_date: billingPeriodEnd,
      base_price: price,
      extra_users_count: 0,
      extra_locations_count: 0,
      extra_lots_count: 0,
      // monthly_total: NOT SET - trigger will calculate automatically
      payment_provider: "manual",
      created_by: user.id,
    }

    console.log("[v0] Creating subscription with data:", subscriptionInsertData)

    const { data: subscription, error: subscriptionError } = await supabase
      .from("organization_subscriptions")
      .insert(subscriptionInsertData)
      .select()
      .single()

    if (subscriptionError) {
      console.error("[v0] Error creating subscription:", subscriptionError)
      return NextResponse.json(
        {
          error: "Failed to create subscription",
          details: subscriptionError.message,
          code: subscriptionError.code,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Subscription created successfully:", {
      id: subscription.id,
      base_price: subscription.base_price,
      monthly_total: subscription.monthly_total,
      status: subscription.subscription_status,
    })

    // Step 8: Calculate invoice amounts
    const subtotal = subscription.monthly_total || price
    const taxRate = 10.0 // VAT 10% for Vietnam
    const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2))
    const totalAmount = Number((subtotal + taxAmount).toFixed(2))

    console.log("[v0] Invoice calculation:", {
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    })

    // Step 9: Create invoice
    const invoiceInsertData = {
      subscription_id: subscription.id,
      organization_id: profile.organization_id,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
      invoice_date: billingPeriodStart,
      due_date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split("T")[0],
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: "USD",
      status: "pending",
      payment_method: "bank_transfer",
      line_items: [
        {
          description: `${packageData.package_name} - ${isYearly ? "Yearly" : "Monthly"} Subscription`,
          quantity: 1,
          unit_price: subtotal,
          amount: subtotal,
        },
      ],
      created_by: user.id,
      // invoice_number: NOT SET - trigger will auto-generate
    }

    console.log("[v0] Creating invoice with data:", invoiceInsertData)

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert(invoiceInsertData)
      .select()
      .single()

    if (invoiceError) {
      console.error("[v0] Error creating invoice:", invoiceError)
      await supabase.from("organization_subscriptions").delete().eq("id", subscription.id)
      console.log("[v0] Rolled back subscription:", subscription.id)
      return NextResponse.json(
        {
          error: "Failed to create invoice",
          details: invoiceError.message,
          code: invoiceError.code,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Invoice created successfully:", {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      total_amount: invoice.total_amount,
      status: invoice.status,
    })

    // Step 10: Send notification email (non-blocking)
    try {
      await fetch(`${request.url.replace("/api/invoices/create", "/api/email/send")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          template: "invoice",
          data: {
            invoice_number: invoice.invoice_number,
            total_amount: totalAmount,
            due_date: invoice.due_date,
            package_name: packageData.package_name,
            billing_cycle: billingCycleValue,
            is_upgrade: isUpgrade,
            is_downgrade: isDowngrade,
          },
        }),
      })
      console.log("[v0] Invoice email sent successfully")
    } catch (emailError) {
      console.error("[v0] Error sending invoice email:", emailError)
      // Don't fail the request if email fails
    }

    // Step 11: Return success response
    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      total_amount: totalAmount,
      due_date: invoice.due_date,
      subscription_id: subscription.id,
      is_upgrade: isUpgrade,
      is_downgrade: isDowngrade,
    })
  } catch (error: any) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json(
      {
        error: sanitizeError(error),
      },
      { status: 500 },
    )
  }
}, RateLimitConfig.STANDARD)
