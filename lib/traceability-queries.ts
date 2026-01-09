// FSMA 204 Traceability Query Functions
// Implements forward (downstream) and backward (upstream) traceability per FDA requirements

import { createBrowserClient } from "@/lib/supabase/client"

export interface TraceabilityNode {
  lot_id: string
  lot_code: string
  product_description: string
  quantity: number
  unit_of_measure: string
  production_date: string
  status: string
  organization_name: string
  depth: number
  parent_lot_id: string | null
  events: CTEEventSummary[]
}

export interface CTEEventSummary {
  event_id: string
  event_type: string
  event_datetime: string
  location_name: string
  location_address: string
  quantity: number
  unit_of_measure: string
  reference_document: string | null
}

/**
 * BACKWARD TRACEABILITY (Upstream)
 * Traces from finished product back to original harvest/receipt
 * Answers: "Where did this product come from?"
 */
export async function traceBackward(lotCode: string): Promise<TraceabilityNode[]> {
  const supabase = createBrowserClient()

  // Step 1: Find the target lot
  const { data: targetLot, error: lotError } = await supabase
    .from("traceability_lots")
    .select(
      `
      id,
      lot_code,
      product_description,
      quantity,
      unit_of_measure,
      production_date,
      status,
      parent_lot_id,
      organizations(name)
    `,
    )
    .eq("lot_code", lotCode)
    .single()

  if (lotError || !targetLot) {
    throw new Error(`Lot ${lotCode} not found`)
  }

  const chain: TraceabilityNode[] = []
  let currentLot: any = targetLot
  let depth = 0

  // Step 2: Traverse parent lots recursively
  while (currentLot) {
    // Get CTE events for this lot
    const { data: eventLinks } = await supabase
      .from("cte_lot_links")
      .select(
        `
        quantity,
        unit_of_measure,
        cte_events(
          id,
          event_type,
          event_datetime,
          reference_document_type,
          reference_document_number,
          locations(location_name, address, city, state)
        )
      `,
      )
      .eq("lot_id", currentLot.id)
      .order("created_at", { ascending: true })

    const events: CTEEventSummary[] =
      eventLinks?.map((link: any) => ({
        event_id: link.cte_events.id,
        event_type: link.cte_events.event_type,
        event_datetime: link.cte_events.event_datetime,
        location_name: link.cte_events.locations?.location_name || "Unknown",
        location_address:
          `${link.cte_events.locations?.address || ""}, ${link.cte_events.locations?.city || ""}, ${link.cte_events.locations?.state || ""}`.trim(),
        quantity: link.quantity,
        unit_of_measure: link.unit_of_measure,
        reference_document: link.cte_events.reference_document_type
          ? `${link.cte_events.reference_document_type}: ${link.cte_events.reference_document_number}`
          : null,
      })) || []

    chain.push({
      lot_id: currentLot.id,
      lot_code: currentLot.lot_code,
      product_description: currentLot.product_description,
      quantity: currentLot.quantity,
      unit_of_measure: currentLot.unit_of_measure,
      production_date: currentLot.production_date,
      status: currentLot.status,
      organization_name: currentLot.organizations?.name || "Unknown",
      depth,
      parent_lot_id: currentLot.parent_lot_id,
      events,
    })

    // Move to parent lot
    if (currentLot.parent_lot_id) {
      const { data: parentLot } = await supabase
        .from("traceability_lots")
        .select(
          `
          id,
          lot_code,
          product_description,
          quantity,
          unit_of_measure,
          production_date,
          status,
          parent_lot_id,
          organizations(name)
        `,
        )
        .eq("id", currentLot.parent_lot_id)
        .single()

      currentLot = parentLot
      depth++
    } else {
      currentLot = null
    }
  }

  return chain
}

/**
 * FORWARD TRACEABILITY (Downstream)
 * Traces from source material to all derived products
 * Answers: "Where did this product go?"
 */
export async function traceForward(lotCode: string): Promise<TraceabilityNode[]> {
  const supabase = createBrowserClient()

  // Step 1: Find the source lot
  const { data: sourceLot, error: lotError } = await supabase
    .from("traceability_lots")
    .select(
      `
      id,
      lot_code,
      product_description,
      quantity,
      unit_of_measure,
      production_date,
      status,
      parent_lot_id,
      organizations(name)
    `,
    )
    .eq("lot_code", lotCode)
    .single()

  if (lotError || !sourceLot) {
    throw new Error(`Lot ${lotCode} not found`)
  }

  const chain: TraceabilityNode[] = []

  // Step 2: Recursive function to get all children
  async function getChildren(lot: any, depth: number) {
    // Get CTE events for this lot
    const { data: eventLinks } = await supabase
      .from("cte_lot_links")
      .select(
        `
        quantity,
        unit_of_measure,
        cte_events(
          id,
          event_type,
          event_datetime,
          reference_document_type,
          reference_document_number,
          locations(location_name, address, city, state)
        )
      `,
      )
      .eq("lot_id", lot.id)
      .order("created_at", { ascending: true })

    const events: CTEEventSummary[] =
      eventLinks?.map((link: any) => ({
        event_id: link.cte_events.id,
        event_type: link.cte_events.event_type,
        event_datetime: link.cte_events.event_datetime,
        location_name: link.cte_events.locations?.location_name || "Unknown",
        location_address:
          `${link.cte_events.locations?.address || ""}, ${link.cte_events.locations?.city || ""}, ${link.cte_events.locations?.state || ""}`.trim(),
        quantity: link.quantity,
        unit_of_measure: link.unit_of_measure,
        reference_document: link.cte_events.reference_document_type
          ? `${link.cte_events.reference_document_type}: ${link.cte_events.reference_document_number}`
          : null,
      })) || []

    chain.push({
      lot_id: lot.id,
      lot_code: lot.lot_code,
      product_description: lot.product_description,
      quantity: lot.quantity,
      unit_of_measure: lot.unit_of_measure,
      production_date: lot.production_date,
      status: lot.status,
      organization_name: lot.organizations?.name || "Unknown",
      depth,
      parent_lot_id: lot.parent_lot_id,
      events,
    })

    // Get all child lots
    const { data: childLots } = await supabase
      .from("traceability_lots")
      .select(
        `
        id,
        lot_code,
        product_description,
        quantity,
        unit_of_measure,
        production_date,
        status,
        parent_lot_id,
        organizations(name)
      `,
      )
      .eq("parent_lot_id", lot.id)

    // Recursively process children
    if (childLots && childLots.length > 0) {
      for (const child of childLots) {
        await getChildren(child, depth + 1)
      }
    }
  }

  await getChildren(sourceLot, 0)

  return chain
}

/**
 * FULL TRACEABILITY CHAIN
 * Combines backward and forward traceability
 * Shows complete supply chain from origin to final destination
 */
export async function getFullTraceabilityChain(lotCode: string) {
  const [backwardChain, forwardChain] = await Promise.all([traceBackward(lotCode), traceForward(lotCode)])

  return {
    upstream: backwardChain.reverse(), // Reverse to show oldest first
    target: backwardChain[0], // The lot we're tracing
    downstream: forwardChain.slice(1), // Exclude the target lot (already in upstream)
  }
}

/**
 * CALCULATE LOSS THROUGH SUPPLY CHAIN
 * Tracks quantity loss at each transformation step
 */
export function calculateSupplyChainLoss(chain: TraceabilityNode[]): {
  totalInputQuantity: number
  totalOutputQuantity: number
  totalLoss: number
  lossPercentage: number
  lossBreakdown: Array<{ step: string; loss: number; percentage: number }>
} {
  if (chain.length === 0) {
    return {
      totalInputQuantity: 0,
      totalOutputQuantity: 0,
      totalLoss: 0,
      lossPercentage: 0,
      lossBreakdown: [],
    }
  }

  const lossBreakdown: Array<{ step: string; loss: number; percentage: number }> = []
  const totalInputQuantity = chain[0].quantity

  for (let i = 0; i < chain.length - 1; i++) {
    const current = chain[i]
    const next = chain[i + 1]

    const loss = current.quantity - next.quantity
    const lossPercentage = (loss / current.quantity) * 100

    lossBreakdown.push({
      step: `${current.lot_code} → ${next.lot_code}`,
      loss: loss,
      percentage: lossPercentage,
    })
  }

  const totalOutputQuantity = chain[chain.length - 1].quantity
  const totalLoss = totalInputQuantity - totalOutputQuantity
  const lossPercentage = (totalLoss / totalInputQuantity) * 100

  return {
    totalInputQuantity,
    totalOutputQuantity,
    totalLoss,
    lossPercentage,
    lossBreakdown,
  }
}
