"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[v0] Critical global error:", error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center space-y-6">
            <div className="mx-auto size-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="size-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Critical Error</h1>
              <p className="text-muted-foreground">
                A critical error occurred. Please refresh the page or contact support if the problem persists.
              </p>
            </div>
            {error.message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="text-sm text-red-800 font-mono break-all">{error.message}</p>
              </div>
            )}
            <Button onClick={reset} className="w-full">
              <RefreshCw className="mr-2 size-4" />
              Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
