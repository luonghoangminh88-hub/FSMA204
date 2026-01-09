"use client"

import type * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "glass inline-flex h-12 w-fit items-center justify-center rounded-xl p-1.5 backdrop-blur-xl",
        "bg-slate-900/80 border border-white/10",
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2",
        "text-base font-medium whitespace-nowrap transition-all duration-200",
        "text-slate-400 hover:text-slate-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400",
        "data-[state=active]:border data-[state=active]:border-emerald-500/30",
        "data-[state=active]:shadow-glow-emerald",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
