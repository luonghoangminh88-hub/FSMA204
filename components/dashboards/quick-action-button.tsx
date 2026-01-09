import Link from "next/link"
import type React from "react"

interface QuickActionButtonProps {
  href: string
  icon: React.ReactNode
  label: string
  color: string
}

export function QuickActionButton({ href, icon, label, color }: QuickActionButtonProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-3 p-6 rounded-2xl glass-card border border-white/5 hover:border-white/20 transition-all duration-300 hover:scale-105"
    >
      <div
        className={`p-4 rounded-xl bg-white/5 ${color} group-hover:scale-110 transition-transform duration-300 group-hover:bg-white/10`}
      >
        {icon}
      </div>
      <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors text-center">
        {label}
      </span>
    </Link>
  )
}
