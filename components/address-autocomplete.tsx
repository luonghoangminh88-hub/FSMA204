"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddressSuggestion {
  place_id: string
  display_name: string
  lat: string
  lon: string
  address: {
    house_number?: string
    road?: string
    suburb?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
}

interface AddressAutocompleteProps {
  onAddressSelect?: (address: {
    fullAddress: string
    city: string
    state: string
    postalCode: string
    country: string
    latitude: number
    longitude: number
  }) => void
  defaultValue?: string
  label?: string
  placeholder?: string
  required?: boolean
  name?: string // Add name prop
}

export function AddressAutocomplete({
  onAddressSelect,
  defaultValue = "",
  label = "Address",
  placeholder = "Enter street address...",
  required = false,
  name = "address", // Default name prop
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout>(undefined) // Add undefined initialValue for useRef
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true)
      try {
        // Using Nominatim OpenStreetMap API (free, no API key required)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
              q: query,
              format: "json",
              addressdetails: "1",
              limit: "5",
            }),
          {
            headers: {
              "User-Agent": "FSMA-204-SaaS/1.0",
            },
          },
        )

        if (response.ok) {
          const data = await response.json()
          setSuggestions(data)
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error("Address search error:", error)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query])

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const address = suggestion.address
    const fullAddress = [address.house_number, address.road, address.suburb].filter(Boolean).join(" ")

    setQuery(suggestion.display_name)
    setShowSuggestions(false)

    if (onAddressSelect) {
      onAddressSelect({
        fullAddress: fullAddress || suggestion.display_name,
        city: address.city || address.suburb || "",
        state: address.state || "",
        postalCode: address.postcode || "",
        country: address.country || "",
        latitude: Number.parseFloat(suggestion.lat),
        longitude: Number.parseFloat(suggestion.lon),
      })
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Label htmlFor={name} className="mt-2 mb-2 block">
        {label} {required && "*"}
      </Label>
      <div className="relative">
        <MapPin className="top-3 left-3 absolute w-4 h-4 text-muted-foreground" />
        <Input
          id={name}
          name={name}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
          required={required}
          autoComplete="off"
        />
        {loading && <Loader2 className="top-3 right-3 absolute w-4 h-4 text-muted-foreground animate-spin" />}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="z-50 absolute border-border bg-background mt-1 border rounded-md w-full shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "flex items-start gap-3 w-full px-4 py-3 text-left text-sm",
                "hover:bg-muted transition-colors cursor-pointer",
              )}
            >
              <MapPin className="flex-shrink-0 mt-0.5 w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{suggestion.display_name}</div>
                {suggestion.address && (
                  <div className="mt-1 text-muted-foreground text-xs">
                    {[
                      suggestion.address.city || suggestion.address.suburb,
                      suggestion.address.state,
                      suggestion.address.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
