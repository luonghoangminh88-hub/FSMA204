"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[v0] Global error caught:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 size-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="size-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Something went wrong!</CardTitle>
          <CardDescription>
            An unexpected error occurred. Our team has been notified and we're working on a fix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.message && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-mono break-all">{error.message}</p>
            </div>
          )}
          {error.digest && (
            <div className="text-xs text-muted-foreground text-center">
              Error ID: <span className="font-mono">{error.digest}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} variant="outline" className="flex-1 bg-transparent">
              <RefreshCw className="mr-2 size-4" />
              Try again
            </Button>
            <Button asChild className="flex-1">
              <Link href="/">
                <Home className="mr-2 size-4" />
                Go home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
