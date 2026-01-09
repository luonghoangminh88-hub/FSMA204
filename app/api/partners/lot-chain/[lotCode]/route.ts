// API endpoint to get all partners involved in a lot's chain
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Next.js 15 yêu cầu params phải được bọc trong Promise
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ lotCode: string }> }
) {
  try {
    const supabase = await createClient()

    // Phải await params trước khi lấy lotCode
    const { lotCode } = await params

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Call the get_lot_partners database function sử dụng biến lotCode đã await
    const { data, error } = await supabase.rpc("get_lot_partners", {
      p_lot_code: lotCode,
    })

    if (error) {
      console.error("[v0] Error fetching lot partners:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ partners: data })
  } catch (error: any) {
    console.error("[v0] Error in lot partners API:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
