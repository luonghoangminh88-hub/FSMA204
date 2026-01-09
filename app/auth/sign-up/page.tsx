"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/hooks/use-language"
import { LanguageSwitcher } from "@/components/fsma/language-switcher"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SignUpPage() {
  const { t } = useLanguage()

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-background via-secondary/20 to-background p-6 md:p-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="size-12 text-primary" />
          <h1 className="text-2xl font-bold">FSMA 204 System</h1>
          <p className="text-sm text-muted-foreground">Food Traceability Compliance</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("auth.registrationDisabled")}</CardTitle>
            <CardDescription>{t("auth.registrationDisabledDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <ShieldCheck className="size-4" />
              <AlertTitle>{t("auth.adminOnly")}</AlertTitle>
              <AlertDescription>{t("auth.adminOnlyDesc")}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("auth.contactAdmin")}</p>
              <Button className="w-full" asChild>
                <Link href="/auth/login">{t("auth.backToLogin")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
