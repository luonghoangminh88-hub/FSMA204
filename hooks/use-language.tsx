"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { translations, type Locale } from "@/lib/i18n"

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: keyof typeof translations.en) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children, initialLocale = "en" }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Load from localStorage - only on client side
    if (typeof window !== "undefined") {
      const savedLocale = localStorage.getItem("fsma_locale") as Locale
      if (savedLocale && (savedLocale === "en" || savedLocale === "vi")) {
        setLocaleState(savedLocale)
      }
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== "undefined") {
      localStorage.setItem("fsma_locale", newLocale)
    }
    // Update user profile in database
    // This would be an API call in production
  }

  const t = (key: keyof typeof translations.en): string => {
    return translations[locale][key] || key
  }

  return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
