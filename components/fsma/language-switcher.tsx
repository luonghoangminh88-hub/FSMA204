"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Globe, Check } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Language / Ngôn ngữ</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocale("en")} className="flex items-center justify-between">
          <span>English</span>
          {locale === "en" && <Check className="size-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("vi")} className="flex items-center justify-between">
          <span>Tiếng Việt</span>
          {locale === "vi" && <Check className="size-4 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
