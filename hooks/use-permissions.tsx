"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { Role } from "@/lib/types"

interface PermissionsContextType {
  role: Role
  canView: (resource: string) => boolean
  canCreate: (resource: string) => boolean
  canEdit: (resource: string) => boolean
  canDelete: (resource: string) => boolean
  canExport: (resource: string) => boolean
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

const rolePermissions: Record<
  Role,
  {
    view: string[]
    create: string[]
    edit: string[]
    delete: string[]
    export: string[]
  }
> = {
  system_admin: {
    view: ["*"],
    create: ["*"],
    edit: ["*"],
    delete: ["*"],
    export: ["*"],
  },
  org_admin: {
    view: ["lots", "cte_events", "locations", "users", "reports", "compliance", "settings"],
    create: ["lots", "cte_events", "locations", "users"],
    edit: ["lots", "cte_events", "locations", "users", "settings"],
    delete: ["lots", "cte_events", "locations"],
    export: ["lots", "cte_events", "reports"],
  },
  manager: {
    view: ["lots", "cte_events", "locations", "reports", "compliance"],
    create: ["lots", "cte_events", "locations"],
    edit: ["lots", "cte_events", "locations"],
    delete: ["lots"],
    export: ["lots", "cte_events", "reports"],
  },
  operator: {
    view: ["lots", "cte_events", "locations"],
    create: ["lots", "cte_events"],
    edit: ["lots", "cte_events"],
    delete: [],
    export: [],
  },
  viewer: {
    view: ["lots", "cte_events", "locations"],
    create: [],
    edit: [],
    delete: [],
    export: [],
  },
}

export function PermissionsProvider({ children, userRole }: { children: ReactNode; userRole: Role }) {
  const permissions = rolePermissions[userRole]

  const hasPermission = (action: keyof typeof permissions, resource: string): boolean => {
    const allowedResources = permissions[action]
    return allowedResources.includes("*") || allowedResources.includes(resource)
  }

  const value: PermissionsContextType = {
    role: userRole,
    canView: (resource) => hasPermission("view", resource),
    canCreate: (resource) => hasPermission("create", resource),
    canEdit: (resource) => hasPermission("edit", resource),
    canDelete: (resource) => hasPermission("delete", resource),
    canExport: (resource) => hasPermission("export", resource),
  }

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionsProvider")
  }
  return context
}
