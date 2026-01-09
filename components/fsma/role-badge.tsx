import { Badge } from "@/components/ui/badge"
import { Shield, ShieldCheck, UserCog, User, Eye } from "lucide-react"
import type { Role } from "@/lib/types"

interface RoleBadgeProps {
  role: Role
  showIcon?: boolean
}

const roleConfig: Record<
  Role,
  {
    label: { en: string; vi: string }
    color: string
    icon: any
  }
> = {
  system_admin: {
    label: { en: "System Admin", vi: "Quản trị hệ thống" },
    color: "bg-purple-500/10 text-purple-700 border-purple-500/20",
    icon: ShieldCheck,
  },
  org_admin: {
    label: { en: "Org Admin", vi: "Quản trị tổ chức" },
    color: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    icon: Shield,
  },
  manager: {
    label: { en: "Manager", vi: "Quản lý" },
    color: "bg-green-500/10 text-green-700 border-green-500/20",
    icon: UserCog,
  },
  operator: {
    label: { en: "Operator", vi: "Vận hành" },
    color: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    icon: User,
  },
  viewer: {
    label: { en: "Viewer", vi: "Người xem" },
    color: "bg-gray-500/10 text-gray-700 border-gray-500/20",
    icon: Eye,
  },
}

export function RoleBadge({ role, showIcon = true }: RoleBadgeProps) {
  const config = roleConfig[role]
  const Icon = config.icon

  return (
    <Badge variant="outline" className={config.color}>
      {showIcon && <Icon className="mr-1 size-3" />}
      {config.label.en}
    </Badge>
  )
}
