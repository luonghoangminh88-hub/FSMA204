"use client"

import type React from "react"

import { LanguageProvider } from "@/hooks/use-language"

export function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return <LanguageProvider initialLocale="en">{children}</LanguageProvider>
}
