"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { PasswordInput } from "@/components/ui/password-input"
import { CheckCircle2, XCircle } from "lucide-react"

export default function SetupPasswordPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    verifyToken()
  }, [])

  const verifyToken = async () => {
    const supabase = createClient()

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        setIsValid(false)
        toast({
          title: "Invalid Link",
          description: "This verification link is invalid or has expired.",
          variant: "destructive",
        })
      } else {
        setIsValid(true)
        setUserEmail(user.email || "")
      }
    } catch (error) {
      setIsValid(false)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const supabase = createClient()

    try {
      console.log("[v0] Getting current session before password update")
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("[v0] Session error:", sessionError)
      }

      console.log("[v0] Current session:", {
        exists: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
      })

      if (!session) {
        throw new Error("No active session. Please use the verification link from your email.")
      }

      console.log("[v0] Updating password for user:", session.user.email)

      const { data, error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error("[v0] Password update error:", error)
        throw error
      }

      console.log("[v0] Password updated successfully:", data)

      toast({
        title: "Password set successfully",
        description: "You can now login with your new password.",
      })

      console.log("[v0] Signing out user to clear session")
      await supabase.auth.signOut()

      setTimeout(() => {
        router.push("/auth/login")
      }, 1500)
    } catch (error: any) {
      console.error("[v0] Error setting password:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to set password. Please try again or contact your administrator.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length < 8) return { strength: "weak", color: "text-red-500", label: "Weak" }
    if (pwd.length < 12) return { strength: "medium", color: "text-yellow-500", label: "Medium" }
    if (pwd.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)) {
      return { strength: "strong", color: "text-green-500", label: "Strong" }
    }
    return { strength: "medium", color: "text-yellow-500", label: "Medium" }
  }

  const passwordStrength = password ? getPasswordStrength(password) : null

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Verifying your invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isValid) {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="size-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
          <CardDescription>
            Welcome! Create a secure password for your account: <strong>{userEmail}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={8}
              />
              {passwordStrength && (
                <p className={`text-sm ${passwordStrength.color}`}>Strength: {passwordStrength.label}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters. Use uppercase, lowercase, numbers, and symbols for a strong password.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || password !== confirmPassword}>
              {isLoading ? "Setting Password..." : "Set Password & Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
