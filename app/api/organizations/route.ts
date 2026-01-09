import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, organization_type, fda_registration_number, fda_registration_status, duns_number, us_agent_name, us_agent_email, poa_signed",
    )
    .order("name")

  if (error) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
