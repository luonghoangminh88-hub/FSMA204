"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, Check, CheckCheck, Trash2, FileCheck, AlertCircle, Package, Users } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { formatDistanceToNow } from "date-fns"
import { enUS, vi } from "date-fns/locale"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  priority: string
  created_at: string
}

export function NotificationDropdown() {
  const { t, locale } = useLanguage()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const dateLocale = locale === "vi" ? vi : enUS

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  useEffect(() => {
    // Fetch unread count on mount and set up polling
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const response = await fetch("/api/notifications?limit=20")
      const data = await response.json()
      if (response.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchUnreadCount() {
    try {
      const response = await fetch("/api/notifications/unread-count")
      const data = await response.json()
      if (response.ok) {
        setUnreadCount(data.unread_count || 0)
      }
    } catch (error) {
      console.error("Error fetching unread count:", error)
    }
  }

  async function markAsRead(id: string) {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      })
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  async function markAllAsRead() {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      })
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  async function deleteNotification(id: string) {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        fetchUnreadCount()
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "fda_request_created":
      case "fda_request_approved":
      case "fda_request_rejected":
        return <FileCheck className="size-4 text-emerald-400" />
      case "lot_expiring_soon":
      case "lot_expired":
        return <AlertCircle className="size-4 text-amber-400" />
      case "compliance_alert":
      case "missing_tlc":
      case "incomplete_cte":
        return <AlertCircle className="size-4 text-rose-400" />
      case "user_assigned":
      case "role_changed":
        return <Users className="size-4 text-blue-400" />
      default:
        return <Package className="size-4 text-gray-400" />
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "urgent":
        return "border-l-4 border-rose-500"
      case "high":
        return "border-l-4 border-amber-500"
      case "normal":
        return "border-l-4 border-emerald-500"
      default:
        return "border-l-4 border-gray-500"
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-white/10 text-white hover:text-white rounded-xl"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full gradient-rose text-white text-xs font-bold flex items-center justify-center shadow-glow-amber">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 glass border-white/10 p-0">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <DropdownMenuLabel className="text-white font-bold text-base p-0">
            {t("notifications.title")}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            >
              <CheckCheck className="size-3 mr-1" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin size-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="size-12 text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 text-center">{t("notifications.noNotifications")}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-white/5 transition-colors ${getPriorityColor(notification.priority)} ${
                    !notification.is_read ? "bg-emerald-500/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4
                          className={`text-sm font-semibold ${notification.is_read ? "text-gray-300" : "text-white"}`}
                        >
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="size-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">{notification.message}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          {notification.link && (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              onClick={() => {
                                if (!notification.is_read) markAsRead(notification.id)
                                setOpen(false)
                              }}
                            >
                              <Link href={notification.link}>{t("notifications.view")}</Link>
                            </Button>
                          )}
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-white/10"
                            >
                              <Check className="size-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
