"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/hooks/use-language"

export default function CheckEmailPage() {
  const { t } = useLanguage()

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-background via-secondary/20 to-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="size-6 text-primary" />
          </div>
          <CardTitle>{t("checkEmail.title")}</CardTitle>
          <CardDescription>{t("checkEmail.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">{t("checkEmail.afterConfirm")}</p>
          <Button asChild>
            <Link href="/auth/login">{t("checkEmail.returnToLogin")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
