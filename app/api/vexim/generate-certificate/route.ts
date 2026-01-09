import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId } = await request.json()

    // Fetch organization data
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    if (!org.fda_registration_number) {
      return NextResponse.json({ error: "FDA registration not found" }, { status: 400 })
    }

    let agent = null
    try {
      const agentResponse = await fetch(`${request.nextUrl.origin}/api/vexim/agent`)
      if (agentResponse.ok) {
        agent = await agentResponse.json()
      }
    } catch (error) {
      console.error("Error fetching agent:", error)
    }

    const certificateHTML = generateCertificateHTML(org, agent)

    return new NextResponse(certificateHTML, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("Error generating certificate:", error)
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 })
  }
}

function generateCertificateHTML(org: any, agent: any) {
  const certificateId = `VX-ELITE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`
  const currentYear = new Date().getFullYear()
  const fiscalYear = currentYear % 2 === 0 ? currentYear : currentYear + 1
  const nextFiscalYear = fiscalYear + 1

  const registrationDate = org.fda_registration_date
    ? new Date(org.fda_registration_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A"

  const expiryDate = org.fda_renewal_deadline
    ? new Date(org.fda_renewal_deadline).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A"

  const agentName = agent?.agent_name || "Robert S. Vexim"
  const agentCompany = agent?.agent_company || "Vexim Global Compliance LLC"
  const agentAddress = agent?.agent_address || "123 Main Street"
  const agentCity = agent?.agent_city || "Delaware"
  const agentState = agent?.agent_state || "DE"
  const agentZip = agent?.agent_zip || "19901"
  const agentPhone = agent?.agent_phone || "+1 (555) 000-0000"
  const agentEmail = agent?.agent_email || "agent@vexim.us"

  const dunsNumber = org.duns_number || "N/A"
  const agentContractExpiry = org.agent_contract_end_date
    ? new Date(org.agent_contract_end_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      })
    : "N/A"
  const facilityAddress = `${org.address || ""}${org.city ? ", " + org.city : ""}${org.country ? ", " + org.country : ""}`
  const verificationUrl = `https://vexim.com/verify/${certificateId}`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VEXIM FDA Registration Certificate</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --royal-blue: #0c1b33;
            --gold-metallic: #a67c00;
            --gold-soft: #d4af37;
            --green-primary: #10b981;
            --green-dark: #059669;
            --cream: #fffdf5;
        }

        body {
            background-color: #d1d5db;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }

        .certificate-wrapper {
            width: 1000px;
            background: var(--cream);
            position: relative;
            padding: 15px;
            box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.5);
            border: 1px solid #c5c5c5;
        }

        .guilloche-border {
            position: absolute;
            inset: 0;
            border: 25px solid transparent;
            border-image: linear-gradient(45deg, var(--gold-metallic), var(--gold-soft), var(--gold-metallic)) 1;
            outline: 3px double var(--gold-metallic);
            outline-offset: -15px;
            pointer-events: none;
        }

        .inner-frame {
            position: absolute;
            inset: 35px;
            border: 1px solid rgba(166, 124, 0, 0.3);
            pointer-events: none;
        }

        .title-main {
            font-family: 'Cinzel', serif;
            color: var(--royal-blue);
            font-weight: 900;
            letter-spacing: 4px;
        }

        .company-name {
            font-family: 'Libre Baskerville', serif;
            color: var(--royal-blue);
            border-bottom: 2px solid var(--gold-metallic);
            display: inline-block;
            padding: 0 40px 5px 40px;
        }

        .section-label {
            font-family: 'Montserrat', sans-serif;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--gold-metallic);
            font-weight: 700;
            font-size: 10px;
        }

        .gold-seal {
            width: 130px;
            height: 130px;
            background: radial-gradient(circle, #f9f295 0%, #e0aa3e 25%, #e0aa3e 50%, #b8860b 100%);
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            position: relative;
            border: 2px solid #fff;
        }

        .seal-ribbon {
            position: absolute;
            width: 40px;
            height: 100px;
            background: #991b1b;
            top: 70px;
            z-index: -1;
            clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%);
        }

        .seal-ribbon.right { left: 75px; transform: rotate(10deg); }
        .seal-ribbon.left { left: 15px; transform: rotate(-10deg); }

        .data-box {
            background: rgba(12, 27, 51, 0.03);
            border-left: 3px solid var(--gold-metallic);
        }

        .qr-area {
            border: 1px dashed var(--gold-metallic);
            padding: 8px;
            background: white;
        }
        
        .vexim-logo {
            font-family: 'Montserrat', sans-serif;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .certificate-wrapper {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>

    <div class="certificate-wrapper">
        <div class="guilloche-border"></div>
        <div class="inner-frame"></div>

        <div style="position: relative; z-index: 10; height: 100%; padding: 48px; display: flex; flex-direction: column; align-items: center;">
            
            <!-- Top Logo & ID -->
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="text-align: left;">
                    <p class="section-label">Certificate Identifier</p>
                    <p style="font-family: monospace; font-size: 11px; font-weight: bold;">${certificateId}</p>
                </div>
                <div style="text-align: center;">
                    <div class="vexim-logo" style="font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #1f2937;">
                        VE<span style="color: var(--green-primary);">XIM</span>
                    </div>
                </div>
                <div style="text-align: right;">
                    <p class="section-label">FDA Fiscal Year</p>
                    <p style="font-family: monospace; font-size: 11px; font-weight: bold;">${fiscalYear} - ${nextFiscalYear}</p>
                </div>
            </div>

            <!-- Main Title Area -->
            <div style="text-align: center; margin-top: 24px;">
                <h1 class="title-main" style="font-size: 36px; margin-bottom: 8px;">Certificate of Registration</h1>
                <p style="font-family: 'Libre Baskerville', serif; font-style: italic; color: #64748b; font-size: 18px;">Verified by Vexim Global Compliance LLC</p>
            </div>

            <!-- Facility Info -->
            <div style="text-align: center; margin-top: 40px; width: 100%;">
                <p class="section-label" style="margin-bottom: 8px;">This is to certify that the establishment</p>
                <h2 class="company-name" style="font-size: 28px; font-weight: bold; margin-bottom: 8px;">${org.name}</h2>
                <p style="color: #64748b; font-size: 14px; font-style: italic;">${facilityAddress}</p>
            </div>

            <!-- Statement -->
            <div style="max-width: 700px; text-align: center; margin-top: 32px;">
                <p style="font-size: 11px; line-height: 1.6; color: #475569; font-weight: 500; font-style: italic;">
                    Has been successfully registered with the U.S. Food and Drug Administration (FDA) as required by the Federal Food, Drug and Cosmetic Act, as amended by the Bioterrorism Act of 2002 and the FDA Food Safety Modernization Act (FSMA). Vexim Global Compliance LLC confirms that the facility's U.S. Agent representation is currently active and valid.
                </p>
            </div>

            <!-- Credentials Grid -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; width: 100%; margin-top: 40px;">
                <div class="data-box" style="padding: 12px;">
                    <p class="section-label">FDA Reg. No.</p>
                    <p style="font-size: 13px; font-weight: bold; font-family: monospace; letter-spacing: 0.5px; margin-top: 4px;">${org.fda_registration_number}</p>
                </div>
                <!-- Replace FEI Number with DUNS NUMBER -->
                <div class="data-box" style="padding: 12px;">
                    <p class="section-label">DUNS Number</p>
                    <p style="font-size: 13px; font-weight: bold; font-family: monospace; letter-spacing: 0.5px; margin-top: 4px;">${dunsNumber}</p>
                </div>
                <!-- Replace UEI with Agent Contract Expiry -->
                <div class="data-box" style="padding: 12px;">
                    <p class="section-label">Thời hạn hợp đồng Agent</p>
                    <p style="font-size: 13px; font-weight: bold; font-family: monospace; letter-spacing: 0.5px; margin-top: 4px;">${agentContractExpiry}</p>
                </div>
                <div class="data-box" style="padding: 12px;">
                    <p class="section-label">Status</p>
                    <p style="font-size: 13px; font-weight: bold; color: var(--green-dark); margin-top: 4px;">● VERIFIED ACTIVE</p>
                </div>
            </div>

            <!-- Footer: Signatures & Seal -->
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: end; margin-top: 48px; padding: 0 24px;">
                
                <!-- QR & Validation Info -->
                <div style="display: flex; gap: 16px; align-items: center; width: 33%;">
                    <div class="qr-area">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verificationUrl)}" alt="QR Code" width="65">
                    </div>
                    <div style="font-size: 9px; color: #64748b;">
                        <p style="font-weight: bold; color: #1e293b; text-transform: uppercase; margin-bottom: 4px;">Electronic Verification</p>
                        <p style="line-height: 1.4;">Scan this code to view the current status of this registration on the VEXIM Global Network.</p>
                        <p style="margin-top: 4px; color: #2563eb; font-weight: bold;">vexim.com/verify</p>
                    </div>
                </div>

                <!-- Gold Seal -->
                <div style="position: relative; display: flex; justify-content: center; width: 33%;">
                    <div class="seal-ribbon left"></div>
                    <div class="seal-ribbon right"></div>
                    <div class="gold-seal" style="text-align: center;">
                        <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #78350f; opacity: 0.6;">Verified by</span>
                        <div class="vexim-logo" style="font-weight: 900; font-size: 20px; letter-spacing: -1px; margin: -2px 0; color: #78350f;">VEXIM</div>
                        <span style="font-size: 8px; font-weight: bold; color: #78350f; border-top: 1px solid rgba(120, 53, 15, 0.3); padding-top: 4px; display: block; margin-top: 2px;">U.S. AGENT</span>
                        <span style="font-size: 7px; color: rgba(120, 53, 15, 0.6); margin-top: 4px; display: block;">EST. 2024</span>
                    </div>
                </div>

                <!-- Authorized Signature -->
                <div style="width: 33%; text-align: right;">
                    <div style="display: inline-block; text-align: center;">
                        <div style="font-family: 'Libre Baskerville', serif; font-style: italic; font-size: 20px; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding: 0 16px 4px 16px;">
                            ${agentName}
                        </div>
                        <p class="section-label" style="margin-top: 8px;">Managing Director</p>
                        <p style="font-size: 10px; color: #94a3b8;">Vexim Global Compliance LLC</p>
                    </div>
                </div>

            </div>

        </div>
    </div>

</body>
</html>
  `
}
