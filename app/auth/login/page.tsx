"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useLanguage } from "@/hooks/use-language"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    toast({
      title: t("common.loading"),
      description: t("auth.loggingIn"),
    })

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      toast({
        title: t("common.success"),
        description: t("auth.loginSuccess"),
      })

      router.push("/dashboard")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred"
      setError(errorMessage)

      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-background via-secondary/20 to-background p-6 md:p-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="size-12 text-primary" />
          <h1 className="text-2xl font-bold">FSMA 204 System</h1>
          <p className="text-sm text-muted-foreground">Food Traceability Compliance</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("auth.welcomeBack")}</CardTitle>
            <CardDescription>{t("auth.loginDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <PasswordInput
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? `${t("common.loading")}` : t("auth.login")}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                {t("auth.noAccount")}{" "}
                <Link href="/auth/sign-up" className="text-primary underline underline-offset-4 hover:text-primary/80">
                  {t("auth.signup")}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy-policy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms-of-service" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  )
}
