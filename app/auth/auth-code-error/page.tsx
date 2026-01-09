"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { XCircle } from "lucide-react"

export default function AuthCodeErrorPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="size-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Invalid Link</CardTitle>
          <CardDescription>
            This verification link is invalid or has expired. Please contact your administrator for a new invitation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/auth/login")} className="w-full">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
